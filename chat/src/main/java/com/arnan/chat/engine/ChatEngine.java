package com.arnan.chat.engine;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.arnan.chat.whatsapp.WhatsAppSender;

@Service
public class ChatEngine {

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

        // 🛑 HARD GATE: FLOW STARTS ONLY WITH "hi"
        if (convo == null) {
            if (!msg.startsWith("hi")) {
                sender.sendText(user, "👋 Please type *Hi* to start.");
                return;
            }

            // ✅ Start conversation ONLY on "hi"
            convo = new HashMap<>();
            convo.put("_id", UUID.randomUUID().toString()); // unique session ID
            convo.put("userId", userId);                    // store user separately
            convo.put("flowId", flowId);                    // dynamic flow selection
            convo.put("currentStep", "START");
            convo.put("ended", false);

            Map<String, Object> context = new HashMap<>();
            context.put("appointment_type", appointmentType); // store type in context
            convo.put("context", context);

            convo.put("lastMessageAt", Instant.now());
        }

        Map<String, Object> result = resolver.handle(convo, input);

        mongo.save(result, "conversations");
        sender.sendAuto(user, result);
    }

}
