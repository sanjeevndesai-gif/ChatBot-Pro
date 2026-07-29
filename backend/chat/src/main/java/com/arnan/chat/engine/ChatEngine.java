package com.arnan.chat.engine;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.arnan.chat.whatsapp.WhatsAppSender;

@Service
public class ChatEngine {

    private static final Logger log = LoggerFactory.getLogger(ChatEngine.class);

    private final MongoTemplate mongo;
    private final FlowResolver resolver;
    private final WhatsAppSender sender;

    public ChatEngine(MongoTemplate mongo,
                      FlowResolver resolver,
                      WhatsAppSender sender) {
        this.mongo = mongo;
        this.resolver = resolver;
        this.sender = sender;
    }

    public void process(String user, String input, String flowId, String appointmentType, String userId) {

        String msg = input == null ? "" : input.trim().toLowerCase();

        // 🔍 Find active conversation for this user
        Query query = new Query();
        query.addCriteria(Criteria.where("userId").is(userId).and("ended").is(false));
        Map<String, Object> convo = mongo.findOne(query, Map.class, "conversations");

        // ── NEW SESSION ─────────────────────────────────────────────────────
        if (convo == null) {
            boolean isQrPayload = isQrPayload(input);

            // Allow QR scans OR plain "hi" to start a conversation.
            // Everything else (random messages without context) gets rejected.
            if (!isQrPayload && !msg.startsWith("hi")) {
                sender.sendText(user, "👋 Please scan the QR code or type *hi* to start.");
                return;
            }

            // Load the flow document to find the correct start step.
            // This ensures each flow begins at its own configured entry point
            // rather than a hardcoded \"START\" step.
            @SuppressWarnings("unchecked")
            Map<String, Object> flowDoc = resolver.getFlowFromCache(flowId);
            if (flowDoc == null) {
                log.warn("Flow document not found for flowId={}", flowId);
                sender.sendText(user, "❌ Flow not found. Please contact support.");
                return;
            }

            String startStepId = flowDoc.containsKey("start")
                    ? String.valueOf(flowDoc.get("start"))
                    : "START";   // backward compat for legacy flows without 'start' field

            @SuppressWarnings("unchecked")
            Map<String, Object> steps = (Map<String, Object>) flowDoc.get("steps");
            @SuppressWarnings("unchecked")
            Map<String, Object> startStep = steps != null
                    ? (Map<String, Object>) steps.get(startStepId)
                    : null;

            if (startStep == null) {
                log.warn("Start step '{}' not found in flow '{}'", startStepId, flowId);
                sender.sendText(user, "❌ Flow configuration error. Please contact support.");
                return;
            }

            // Build the new session at the start step
            Map<String, Object> ctx = new HashMap<>();
            ctx.put("appointment_type", appointmentType);
            ctx.put("userId", userId);

            convo = new HashMap<>();
            convo.put("_id", UUID.randomUUID().toString());
            convo.put("userId", userId);
            convo.put("flowId", flowId);
            convo.put("currentStep", startStepId);
            convo.put("ended", false);
            convo.put("context", ctx);
            convo.put("lastMessageAt", Instant.now());

            @SuppressWarnings("unchecked")
            Map<String, Object> startMsg = (Map<String, Object>) startStep.get("message");
            if (startMsg != null) {
                convo.put("message", new HashMap<>(startMsg));
            }

            // Persist the session and send the first step's prompt message.
            // The QR payload / 'hi' is NOT passed as user input — the user's
            // NEXT message will be their real response to the first step.
            mongo.save(convo, "conversations");
            sender.sendAuto(user, convo);
            log.info("New session started: flowId={} userId={} startStep={}", flowId, userId, startStepId);
            return;
        }

        // ── EXISTING SESSION: process user's response through FlowResolver ──
        Map<String, Object> result = resolver.handle(convo, input);
        mongo.save(result, "conversations");
        sender.sendAuto(user, result);
    }

    /**
     * Returns true when the incoming message is a QR code payload rather than
     * a user-typed message. QR payloads start with \"REF:\" (base64 token) or
     * contain the \"type=\" param used in plain-param QR links.
     */
    private boolean isQrPayload(String text) {
        if (text == null || text.isBlank()) return false;
        return text.startsWith("REF:") ||
               (text.contains("type=") && text.contains("&"));
    }

}
