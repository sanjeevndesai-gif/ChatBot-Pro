package com.arnan.chat.engine;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

@Service
public class FlowResolver {

	private final MongoTemplate mongo;
	private final ValidationEngine validator;
	private final ConditionEvaluator evaluator;
	private final ActionExecutor executor;

	private final long timeoutSeconds;

	// 🔥 Self proxy for @Cacheable to work
	@Autowired
	private FlowResolver self;

	public FlowResolver(MongoTemplate mongo,
				    ValidationEngine validator,
				    ConditionEvaluator evaluator,
				    ActionExecutor executor,
				    com.arnan.chat.config.ChatProperties props) {

		this.mongo = mongo;
		this.validator = validator;
		this.evaluator = evaluator;
		this.executor = executor;
		this.timeoutSeconds = props.getSessionTimeoutSeconds();
	}

	public Map<String, Object> handle(Map<String, Object> convo, String input) {

		input = normalizeInput(input);

		if (input == null) {
			return end(convo, "❌ Invalid message received.");
		}

		if (!(convo instanceof HashMap)) {
			convo = new HashMap<>(convo);
		}

		boolean ended = Boolean.TRUE.equals(convo.get("ended"));

		Object lastMessageObj = convo.get("lastMessageAt");
		Instant lastMessageAt = null;

		if (lastMessageObj instanceof Instant) {
			lastMessageAt = (Instant) lastMessageObj;
		} else if (lastMessageObj instanceof java.util.Date) {
			lastMessageAt = ((java.util.Date) lastMessageObj).toInstant();
		}

		boolean timedOut = lastMessageAt != null && lastMessageAt.isBefore(Instant.now().minusSeconds(timeoutSeconds));

		// 🔥 USE CACHE HERE
		Map<String, Object> flow = self.getFlowFromCache(String.valueOf(convo.get("flowId")));

		if (flow == null) {
			return end(convo, "❌ Flow not found.");
		}

		// Restart logic
		if ((ended || timedOut) && !"START".equals(convo.get("currentStep"))) {

			String startStep = (String) flow.get("start");
			Map<String, Object> steps = (Map<String, Object>) flow.get("steps");

			Map<String, Object> start = (Map<String, Object>) steps.get(startStep);

			Map<String, Object> newConvo = new HashMap<>();
			newConvo.put("_id", java.util.UUID.randomUUID().toString());
			newConvo.put("flowId", convo.get("flowId"));
			newConvo.put("currentStep", startStep);
			newConvo.put("context", new HashMap<>());
			newConvo.put("ended", false);
			newConvo.put("message", new HashMap<>((Map<String, Object>) start.get("message")));
			newConvo.put("lastMessageAt", Instant.now());

			mongo.save(newConvo, "conversations");
			return newConvo;
		}

		Map<String, Object> steps = (Map<String, Object>) flow.get("steps");

		String stepId = String.valueOf(convo.get("currentStep"));
		Map<String, Object> step = (Map<String, Object>) steps.get(stepId);

		if (step == null) {
			return end(convo, "❌ Invalid step: " + stepId);
		}

		Map<String, Object> ctx = (Map<String, Object>) convo.get("context");

		if (ctx == null || !(ctx instanceof HashMap)) {
			ctx = new HashMap<>(ctx == null ? Map.of() : ctx);
			convo.put("context", ctx);
		}

		try {
			validator.validate(step, ctx, input);

		} catch (IllegalArgumentException e) {
			convo.put("message", new HashMap<>((Map<String, Object>) step.get("message")));
			convo.put("lastMessageAt", Instant.now());
			return convo;

		} catch (RuntimeException e) {
			return end(convo, "❌ Too many invalid attempts. Session ended.");
		}

		if (step.containsKey("saveAs")) {
			ctx.put(step.get("saveAs").toString(), input);
		}

		executor.execute(step, ctx);

		String next = evaluator.resolve(step, ctx);
		Map<String, Object> nextStep = (Map<String, Object>) steps.get(next);

		if (nextStep == null) {
			return end(convo, "✅ Process completed.");
		}

		convo.put("currentStep", next);
		convo.put("message", new HashMap<>((Map<String, Object>) nextStep.get("message")));
		convo.put("lastMessageAt", Instant.now());

		return convo;
	}

	@Cacheable(value = "flows", key = "#flowId")
	@SuppressWarnings("unchecked")
	public Map<String, Object> getFlowFromCache(String flowId) {

		Object result = mongo.findById(flowId, Map.class, "flows");

		if (result == null) {
			return null;
		}

		return (Map<String, Object>) result;
	}

	private Map<String, Object> end(Map<String, Object> convo, String msg) {
		convo.put("message", Map.of("en", msg));
		convo.put("ended", true);
		convo.put("lastMessageAt", Instant.now());
		return convo;
	}

	@SuppressWarnings("unchecked")
	private String normalizeInput(Object rawInput) {
		if (rawInput instanceof String s)
			return s.trim();

		if (rawInput instanceof Map<?, ?> map) {
			try {
				var entry = (List<Map<String, Object>>) map.get("entry");
				var changes = (List<Map<String, Object>>) entry.get(0).get("changes");
				var value = (Map<String, Object>) changes.get(0).get("value");
				var messages = (List<Map<String, Object>>) value.get("messages");
				var text = (Map<String, Object>) messages.get(0).get("text");
				return text.get("body").toString().trim();
			} catch (Exception e) {
				return null;
			}
		}
		return null;
	}
}
