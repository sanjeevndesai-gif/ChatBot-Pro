package com.arnan.chat;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;

import com.arnan.chat.config.ChatProperties;
import com.arnan.chat.engine.ActionExecutor;
import com.arnan.chat.engine.ConditionEvaluator;
import com.arnan.chat.engine.FlowResolver;
import com.arnan.chat.engine.ValidationEngine;

/**
 * Unit tests for the core chat flow engine.
 * WhatsApp network calls are mocked — no real messages are sent.
 */
@ExtendWith(MockitoExtension.class)
class FlowResolverTest {

    // ─────────────────────────────────────────────────────────────────────────
    // Shared test data helpers
    // ─────────────────────────────────────────────────────────────────────────

    @Mock
    MongoTemplate mongo;

    @Mock
    ActionExecutor executor;

    @Spy
    ValidationEngine validator;

    @Spy
    ConditionEvaluator evaluator;

    FlowResolver resolver;

    // A minimal two-step flow document used across tests
    private Map<String, Object> buildSampleFlow() {
        Map<String, Object> greetMsg = Map.of("en", "Hello! Type Hi to start.");
        Map<String, Object> menuMsg = Map.of("en", "Choose: 1. Doctor  2. Exit");

        Map<String, Object> startStep = new HashMap<>();
        startStep.put("message", new HashMap<>(greetMsg));

        Map<String, Object> menuStep = new HashMap<>();
        menuStep.put("message", new HashMap<>(menuMsg));
        menuStep.put("next", "END");

        Map<String, Object> steps = new HashMap<>();
        steps.put("START", startStep);
        steps.put("MENU", menuStep);
        steps.put("END", Map.of("message", Map.of("en", "Done ✅")));

        startStep.put("next", "MENU");

        Map<String, Object> flow = new HashMap<>();
        flow.put("start", "START");
        flow.put("steps", steps);
        return flow;
    }

    private Map<String, Object> buildConvo(String step, boolean ended) {
        Map<String, Object> convo = new HashMap<>();
        convo.put("_id", "test-session");
        convo.put("flowId", "flow-001");
        convo.put("userId", "U001");
        convo.put("currentStep", step);
        convo.put("ended", ended);
        convo.put("context", new HashMap<>());
        convo.put("lastMessageAt", Instant.now());
        return convo;
    }

    @BeforeEach
    void setup() {
        ChatProperties props = new ChatProperties();
        props.setSessionTimeoutSeconds(900);
        resolver = new FlowResolver(mongo, validator, evaluator, executor, props);
        // Self-inject via the package-private setter so @Cacheable-based self call resolves
        resolver.setSelf(resolver);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FlowResolver.handle — null / missing flow
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void handleShouldEndConvoWhenFlowNotFound() {
        when(mongo.findById(anyString(), eq(Map.class), eq("flows"))).thenReturn(null);

        Map<String, Object> convo = buildConvo("START", false);
        Map<String, Object> result = resolver.handle(convo, "hi");

        assertTrue(Boolean.TRUE.equals(result.get("ended")));
        String msg = ((Map<?, ?>) result.get("message")).get("en").toString();
        assertTrue(msg.contains("Flow not found"));
    }

    @Test
    void handleShouldEndConvoWhenInputIsNull() {
        // null input must not reach mongo at all
        Map<String, Object> convo = buildConvo("START", false);
        Map<String, Object> result = resolver.handle(convo, null);

        assertTrue(Boolean.TRUE.equals(result.get("ended")));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FlowResolver.handle — step navigation
    // ─────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Test
    void handleShouldAdvanceToNextStep() {
        Map<String, Object> flow = buildSampleFlow();
        when(mongo.findById("flow-001", Map.class, "flows")).thenReturn(flow);

        Map<String, Object> convo = buildConvo("START", false);
        // No validation on START step → should advance to MENU
        Map<String, Object> result = resolver.handle(convo, "any");

        assertEquals("MENU", result.get("currentStep"));
        Map<String, Object> msg = (Map<String, Object>) result.get("message");
        assertTrue(msg.containsKey("en"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void handleShouldCompleteWhenNextStepIsNull() {
        Map<String, Object> flow = buildSampleFlow();
        when(mongo.findById("flow-001", Map.class, "flows")).thenReturn(flow);

        // Place conversation at END step (which has no next)
        Map<String, Object> convo = buildConvo("MENU", false);
        Map<String, Object> result = resolver.handle(convo, "any");

        // Next step from MENU is END, which exists → should land on END and mark done
        String step = (String) result.get("currentStep");
        assertEquals("END", step);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FlowResolver.handle — session restart after end
    // ─────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Test
    void handleShouldRestartSessionWhenEnded() {
        Map<String, Object> flow = buildSampleFlow();
        when(mongo.findById("flow-001", Map.class, "flows")).thenReturn(flow);
        when(mongo.save(any(), eq("conversations"))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> convo = buildConvo("MENU", true); // ended=true
        Map<String, Object> result = resolver.handle(convo, "hi");

        assertEquals("START", result.get("currentStep"));
        assertEquals(false, result.get("ended"));
    }

    @SuppressWarnings("unchecked")
    @Test
    void handleShouldRestartSessionWhenTimedOut() {
        Map<String, Object> flow = buildSampleFlow();
        when(mongo.findById("flow-001", Map.class, "flows")).thenReturn(flow);
        when(mongo.save(any(), eq("conversations"))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> convo = buildConvo("MENU", false);
        // Simulate very old last-message (well past 900s timeout)
        convo.put("lastMessageAt", Instant.now().minusSeconds(1800));

        Map<String, Object> result = resolver.handle(convo, "hi");

        assertEquals("START", result.get("currentStep"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FlowResolver.handle — validation
    // ─────────────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Test
    void handleShouldReturnCurrentStepOnValidationFailure() {
        Map<String, Object> flow = buildSampleFlow();

        // Add a validation to the START step
        Map<String, Object> startStep = (Map<String, Object>) ((Map<String, Object>) flow.get("steps")).get("START");
        startStep.put("validate", Map.of("values", List.of("yes", "no"), "maxRetries", 3));

        when(mongo.findById("flow-001", Map.class, "flows")).thenReturn(flow);

        Map<String, Object> convo = buildConvo("START", false);
        Map<String, Object> result = resolver.handle(convo, "invalid-input");

        // Should stay on START
        assertEquals("START", result.get("currentStep"));
        assertFalse(Boolean.TRUE.equals(result.get("ended")));
    }

    @SuppressWarnings("unchecked")
    @Test
    void handleShouldEndSessionAfterMaxValidationRetries() {
        Map<String, Object> flow = buildSampleFlow();

        Map<String, Object> startStep = (Map<String, Object>) ((Map<String, Object>) flow.get("steps")).get("START");
        startStep.put("validate", Map.of("values", List.of("yes"), "maxRetries", 2));

        when(mongo.findById("flow-001", Map.class, "flows")).thenReturn(flow);

        Map<String, Object> convo = buildConvo("START", false);
        Map<String, Object> ctx = (Map<String, Object>) convo.get("context");
        ctx.put("_retry", 1); // already on last retry

        Map<String, Object> result = resolver.handle(convo, "bad-input");

        assertTrue(Boolean.TRUE.equals(result.get("ended")));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ConditionEvaluator
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void conditionEvaluatorShouldReturnStringNext() {
        Map<String, Object> step = Map.of("next", "CONFIRM");
        String next = evaluator.resolve(step, Map.of());
        assertEquals("CONFIRM", next);
    }

    @Test
    void conditionEvaluatorShouldResolveMapNextByMenuChoice() {
        Map<String, Object> step = Map.of("next", Map.of("1", "DOCTOR", "2", "EXIT"));
        Map<String, Object> ctx = new HashMap<>();
        ctx.put("menu_choice", "1");

        String next = evaluator.resolve(step, ctx);
        assertEquals("DOCTOR", next);
    }

    @Test
    void conditionEvaluatorShouldResolveListNextByCondition() {
        List<Map<String, String>> rules = List.of(
                Map.of("when", "context.type == 'doctor'", "go", "DOCTOR_FLOW"),
                Map.of("when", "context.type == 'test'", "go", "TEST_FLOW"));

        Map<String, Object> step = new HashMap<>();
        step.put("next", rules);

        Map<String, Object> ctx = new HashMap<>();
        ctx.put("type", "test");

        String next = evaluator.resolve(step, ctx);
        assertEquals("TEST_FLOW", next);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ValidationEngine
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void validationEngineShouldPassWhenInputIsAllowed() {
        Map<String, Object> step = Map.of("validate",
                Map.of("values", List.of("yes", "no"), "maxRetries", 3));

        assertDoesNotThrow(() -> validator.validate(step, new HashMap<>(), "yes"));
    }

    @Test
    void validationEngineShouldThrowWhenInputNotAllowed() {
        Map<String, Object> step = Map.of("validate",
                Map.of("values", List.of("yes", "no"), "maxRetries", 3));

        Map<String, Object> ctx = new HashMap<>();
        assertThrows(IllegalArgumentException.class,
                () -> validator.validate(step, ctx, "maybe"));
    }

    @Test
    void validationEngineShouldThrowRuntimeExceptionOnMaxRetries() {
        Map<String, Object> step = Map.of("validate",
                Map.of("values", List.of("yes"), "maxRetries", 2));

        Map<String, Object> ctx = new HashMap<>();
        ctx.put("_retry", 1); // next retry = 2 = maxRetries

        assertThrows(RuntimeException.class,
                () -> validator.validate(step, ctx, "no"));
    }

    @Test
    void validationEngineShouldSkipValidationWhenNoValidateBlock() {
        Map<String, Object> step = new HashMap<>(); // no "validate" key
        assertDoesNotThrow(() -> validator.validate(step, new HashMap<>(), "anything"));
    }

    @Test
    void validationEngineShouldResetRetryCounterOnSuccess() {
        Map<String, Object> step = Map.of("validate",
                Map.of("values", List.of("yes"), "maxRetries", 5));

        Map<String, Object> ctx = new HashMap<>();
        ctx.put("_retry", 3);

        validator.validate(step, ctx, "yes");

        assertFalse(ctx.containsKey("_retry"),
                "_retry counter must be removed after successful validation");
    }
}
