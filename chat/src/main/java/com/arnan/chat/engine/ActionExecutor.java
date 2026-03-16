package com.arnan.chat.engine;

import java.util.HashMap;
import java.util.Map;

import com.arnan.chat.whatsapp.ExternalApiService;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class ActionExecutor {

    private final RestTemplate rest;
    private final ExternalApiService externalApiService;
    private final ObjectMapper objectMapper;

    public ActionExecutor(RestTemplate rest,
                          ExternalApiService externalApiService,
                          ObjectMapper objectMapper) {
        this.rest = rest;
        this.externalApiService = externalApiService;
        this.objectMapper = objectMapper;
    }

    public void execute(Map<String,Object> step,
                        Map<String,Object> ctx) {

        Map<String,Object> action =
            (Map<String,Object>) step.get("action");

        if (action == null) {
            return;
        }

        if ("REST".equals(action.get("type"))) {
            String url = action.get("url").toString();
            ResponseEntity<Object> res =
                rest.getForEntity(url, Object.class);
            ctx.put(action.get("saveAs").toString(), res.getBody());
            return;
        }

        if (!"API".equals(action.get("type"))) {
            return;
        }

        String service = String.valueOf(action.getOrDefault("service", ""));
        String operation = String.valueOf(action.getOrDefault("operation", ""));
        String saveAs = String.valueOf(action.getOrDefault("saveAs", ""));

        Object apiResponse = runDoctorFlowApiOperation(service, operation, action, ctx);
        if (!saveAs.isBlank()) {
            ctx.put(saveAs, apiResponse);
        }
    }

    @SuppressWarnings("unchecked")
    private Object runDoctorFlowApiOperation(String service,
                                             String operation,
                                             Map<String, Object> action,
                                             Map<String, Object> ctx) {

        if ("AUTH_SERVICE".equals(service) && "GET_USER_PROFILE".equals(operation)) {
            Map<String, Object> request = (Map<String, Object>) action.getOrDefault("request", Map.of());
            String userId = String.valueOf(resolveRef(String.valueOf(request.getOrDefault("userId", "")), ctx));
            return objectMapper.convertValue(externalApiService.getUserProfile(userId), Map.class);
        }

        if ("BOOK_APPOINTMENT_SERVICE".equals(service) && "GET_AVAILABLE_SLOTS".equals(operation)) {
            Map<String, Object> request = (Map<String, Object>) action.getOrDefault("request", Map.of());
            String doctorId = String.valueOf(resolveRef(String.valueOf(request.getOrDefault("doctorId", "")), ctx));
            String date = String.valueOf(resolveRef(String.valueOf(request.getOrDefault("date", "")), ctx));
            return objectMapper.convertValue(externalApiService.getSlots(date, doctorId), Map.class);
        }

        if ("BOOK_APPOINTMENT_SERVICE".equals(service) && "CREATE_APPOINTMENT".equals(operation)) {
            Map<String, Object> request = (Map<String, Object>) action.getOrDefault("request", Map.of());
            Map<String, Object> payload = new HashMap<>();
            for (Map.Entry<String, Object> entry : request.entrySet()) {
                Object raw = entry.getValue();
                if (raw instanceof String ref) {
                    payload.put(entry.getKey(), resolveRef(ref, ctx));
                } else {
                    payload.put(entry.getKey(), raw);
                }
            }
            return objectMapper.convertValue(externalApiService.createAppointment(payload), Map.class);
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

