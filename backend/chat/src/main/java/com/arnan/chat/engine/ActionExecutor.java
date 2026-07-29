package com.arnan.chat.engine;

import java.util.HashMap;
import java.util.Map;

import com.arnan.chat.whatsapp.ExternalApiService;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ActionExecutor {

    private final RestTemplate rest;
    private final ExternalApiService externalApiService;
    private final ObjectMapper objectMapper;
    private final MongoTemplate mongo;

    public ActionExecutor(RestTemplate rest,
                          ExternalApiService externalApiService,
                          ObjectMapper objectMapper,
                          MongoTemplate mongo) {
        this.rest = rest;
        this.externalApiService = externalApiService;
        this.objectMapper = objectMapper;
        this.mongo = mongo;
    }

    @SuppressWarnings("unchecked")
    public void execute(Map<String,Object> step,
                        Map<String,Object> ctx) {

        Map<String,Object> action =
            (Map<String,Object>) step.get("action");

        if (action == null) {
            return;
        }

        String actionType = String.valueOf(action.get("type"));

        // ── FLOW_REDIRECT: signal FlowResolver to switch the active flow ──
        if ("FLOW_REDIRECT".equals(actionType)) {
            String targetFlow = String.valueOf(action.getOrDefault("targetFlow", ""));
            if (!targetFlow.isBlank()) {
                ctx.put("__redirectTo", targetFlow);
            }
            return;
        }

        // ── MONGO_INSERT: save a document directly to a MongoDB collection ──
        if ("MONGO_INSERT".equals(actionType)) {
            String collection = String.valueOf(action.getOrDefault("collection", "support_tickets"));
            Map<String, Object> request = (Map<String, Object>) action.getOrDefault("request", Map.of());
            Document doc = new Document();
            for (Map.Entry<String, Object> entry : request.entrySet()) {
                Object raw = entry.getValue();
                doc.put(entry.getKey(), raw instanceof String ref ? resolveRef(ref, ctx) : raw);
            }
            String ticketId = java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            doc.put("ticketId", ticketId);
            doc.put("createdAt", java.time.Instant.now().toString());
            mongo.save(doc, collection);
            String saveAs = String.valueOf(action.getOrDefault("saveAs", "ticket"));
            ctx.put(saveAs, Map.of("ticketId", ticketId));
            ctx.put("ticketId", ticketId);
            return;
        }

        if ("REST".equals(actionType)) {
            String url = action.get("url").toString();
            ResponseEntity<Object> res =
                rest.getForEntity(url, Object.class);
            ctx.put(action.get("saveAs").toString(), res.getBody());
            return;
        }

        if (!"API".equals(actionType)) {
            return;
        }

        String service = String.valueOf(action.getOrDefault("service", ""));
        String operation = String.valueOf(action.getOrDefault("operation", ""));
        String saveAs = String.valueOf(action.getOrDefault("saveAs", ""));

        Object apiResponse = runApiOperation(service, operation, action, ctx);
        if (!saveAs.isBlank()) {
            ctx.put(saveAs, apiResponse);
        }
    }

    @SuppressWarnings("unchecked")
    private Object runApiOperation(String service,
                                   String operation,
                                   Map<String, Object> action,
                                   Map<String, Object> ctx) {

        Map<String, Object> request = (Map<String, Object>) action.getOrDefault("request", Map.of());

        // ── AUTH_SERVICE operations ─────────────────────────────────────────
        if ("AUTH_SERVICE".equals(service)) {

            if ("GET_USER_PROFILE".equals(operation)) {
                String userId = String.valueOf(resolveRef(
                        String.valueOf(request.getOrDefault("userId", "")), ctx));
                return objectMapper.convertValue(externalApiService.getUserProfile(userId), Map.class);
            }

            if ("GET_ALL_DOCTORS".equals(operation)) {
                return objectMapper.convertValue(externalApiService.getAllDoctors(), Object.class);
            }

            if ("GET_CLINICS_BY_LOCATION".equals(operation)) {
                String city = String.valueOf(resolveRef(
                        String.valueOf(request.getOrDefault("city", "")), ctx));
                return objectMapper.convertValue(externalApiService.getClinicsByLocation(city), Object.class);
            }
        }

        // ── BOOK_APPOINTMENT_SERVICE operations ─────────────────────────────
        if ("BOOK_APPOINTMENT_SERVICE".equals(service)) {

            if ("GET_AVAILABLE_SLOTS".equals(operation)) {
                String doctorId = String.valueOf(resolveRef(
                        String.valueOf(request.getOrDefault("doctorId", "")), ctx));
                String date = String.valueOf(resolveRef(
                        String.valueOf(request.getOrDefault("date", "")), ctx));
                return objectMapper.convertValue(externalApiService.getSlots(date, doctorId), Map.class);
            }

            if ("CREATE_APPOINTMENT".equals(operation)) {
                Map<String, Object> payload = new HashMap<>();
                for (Map.Entry<String, Object> entry : request.entrySet()) {
                    Object raw = entry.getValue();
                    payload.put(entry.getKey(), raw instanceof String ref ? resolveRef(ref, ctx) : raw);
                }
                return objectMapper.convertValue(externalApiService.createAppointment(payload), Map.class);
            }

            if ("GET_APPOINTMENT_REPORT".equals(operation)) {
                String userId = String.valueOf(resolveRef(
                        String.valueOf(request.getOrDefault("userId", "")), ctx));
                String date = String.valueOf(resolveRef(
                        String.valueOf(request.getOrDefault("date", "")), ctx));
                return objectMapper.convertValue(externalApiService.getAppointmentReport(userId, date), Object.class);
            }

            if ("SAVE_SCHEDULE".equals(operation)) {
                Map<String, Object> payload = new HashMap<>();
                for (Map.Entry<String, Object> entry : request.entrySet()) {
                    Object raw = entry.getValue();
                    payload.put(entry.getKey(), raw instanceof String ref ? resolveRef(ref, ctx) : raw);
                }
                return objectMapper.convertValue(externalApiService.saveSchedule(payload), Object.class);
            }
        }

        if ("GOOGLE_CALENDAR".equals(service) && "CREATE_REMINDER".equals(operation)) {
            return Map.of("status", "SKIPPED", "reason", "Calendar integration is not wired yet");
        }

        return Map.of("status", "UNSUPPORTED_ACTION", "service", service, "operation", operation);
    }

    @SuppressWarnings("unchecked")
    private Object resolveRef(String expression, Map<String, Object> ctx) {
        if (expression == null || !expression.startsWith("context.")) {
            return expression;
        }

        String[] parts = expression.substring("context.".length()).split("\\.");
        Object current = ctx;

        for (String part : parts) {
            if (!(current instanceof Map<?, ?> map)) {
                return null;
            }
            current = ((Map<String, Object>) map).get(part);
            if (current == null) {
                return null;
            }
        }

        return current;
    }
}


