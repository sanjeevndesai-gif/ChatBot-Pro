package com.arnan.chat.engine;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
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
    public void execute(Map<String, Object> step, Map<String, Object> ctx) {

        Map<String, Object> action = (Map<String, Object>) step.get("action");
        if (action == null) return;

        String actionType = String.valueOf(action.get("type"));

        // ── FLOW_REDIRECT ──────────────────────────────────────────────────────
        if ("FLOW_REDIRECT".equals(actionType)) {
            String targetFlow = String.valueOf(action.getOrDefault("targetFlow", ""));
            if (!targetFlow.isBlank()) ctx.put("__redirectTo", targetFlow);
            return;
        }

        // ── MONGO_INSERT ───────────────────────────────────────────────────────
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

        // ── RESOLVE_CHOICE ─────────────────────────────────────────────────────
        // Resolves a 1-based user choice (e.g. "2") to an item in a context list.
        // If "field" is given, saves that field's value; otherwise saves the whole item.
        if ("RESOLVE_CHOICE".equals(actionType)) {
            String listKey    = String.valueOf(action.getOrDefault("list",   ""));
            String choiceKey  = String.valueOf(action.getOrDefault("choice", ""));
            String fieldKey   = String.valueOf(action.getOrDefault("field",  ""));
            String saveAs     = String.valueOf(action.getOrDefault("saveAs", ""));

            Object list = ctx.get(listKey);
            String choiceStr  = String.valueOf(ctx.getOrDefault(choiceKey, "0")).trim();

            if (list instanceof List<?> listObj) {
                try {
                    int idx = Integer.parseInt(choiceStr) - 1; // 1-based → 0-based
                    if (idx >= 0 && idx < listObj.size()) {
                        Object item = listObj.get(idx);
                        Object toSave = (!fieldKey.isBlank() && item instanceof Map<?, ?> m)
                                ? ((Map<String, Object>) m).get(fieldKey)
                                : item;
                        if (!saveAs.isBlank() && toSave != null) ctx.put(saveAs, toSave);
                    }
                } catch (NumberFormatException ignored) {}
            }
            return;
        }

        // ── GENERATE_CALENDAR_LINK ─────────────────────────────────────────────
        // Builds a Google Calendar "add event" URL from context fields.
        if ("GENERATE_CALENDAR_LINK".equals(actionType)) {
            String date        = String.valueOf(ctx.getOrDefault("date",         ""));
            String patientName = String.valueOf(ctx.getOrDefault("patient_name", "Patient"));
            String purpose     = String.valueOf(ctx.getOrDefault("purpose",      "Medical Appointment"));
            String doctorName  = getDoctorNameFromContext(ctx);
            String clinicName  = getClinicNameFromContext(ctx);

            // Parse DD-MM-YYYY → YYYYMMDD for calendar link
            String calDate = "";
            try {
                String[] parts = date.split("-");
                if (parts.length == 3) calDate = parts[2] + parts[1] + parts[0];
            } catch (Exception ignored) {}

            String dateParam = calDate.isBlank() ? ""
                    : "&dates=" + calDate + "T090000/" + calDate + "T093000";

            String title    = enc("Appointment: " + patientName + " with " + doctorName);
            String details  = enc("Patient: " + patientName + "\nPurpose: " + purpose + "\nClinic: " + clinicName);
            String location = enc(clinicName);

            String link = "https://calendar.google.com/calendar/render?action=TEMPLATE"
                    + "&text=" + title
                    + dateParam
                    + "&details=" + details
                    + "&location=" + location;

            ctx.put("calendar_link", link);
            return;
        }

        // ── REST ───────────────────────────────────────────────────────────────
        if ("REST".equals(actionType)) {
            String url = action.get("url").toString();
            ResponseEntity<Object> res = rest.getForEntity(url, Object.class);
            ctx.put(action.get("saveAs").toString(), res.getBody());
            return;
        }

        if (!"API".equals(actionType)) return;

        String service   = String.valueOf(action.getOrDefault("service",   ""));
        String operation = String.valueOf(action.getOrDefault("operation", ""));
        String saveAs    = String.valueOf(action.getOrDefault("saveAs",    ""));

        Object apiResponse = runApiOperation(service, operation, action, ctx);
        if (!saveAs.isBlank() && apiResponse != null) ctx.put(saveAs, apiResponse);
    }

    @SuppressWarnings("unchecked")
    private Object runApiOperation(String service, String operation,
                                   Map<String, Object> action, Map<String, Object> ctx) {

        Map<String, Object> request =
                (Map<String, Object>) action.getOrDefault("request", Map.of());

        // ── AUTH_SERVICE ───────────────────────────────────────────────────────
        if ("AUTH_SERVICE".equals(service)) {

            if ("GET_USER_PROFILE".equals(operation)) {
                String userId = str(resolveRef(str(request.getOrDefault("userId", "")), ctx));
                return objectMapper.convertValue(externalApiService.getUserProfile(userId), Map.class);
            }

            if ("GET_ALL_DOCTORS".equals(operation)) {
                return objectMapper.convertValue(externalApiService.getAllDoctors(), Object.class);
            }

            if ("GET_DOCTORS_BY_CLINIC".equals(operation)) {
                String clinicId = str(resolveRef(str(request.getOrDefault("clinicId", "")), ctx));
                return objectMapper.convertValue(externalApiService.getDoctorsByClinic(clinicId), List.class);
            }

            if ("GET_CLINICS_BY_LOCATION".equals(operation)) {
                String city = str(resolveRef(str(request.getOrDefault("city", "")), ctx));
                return objectMapper.convertValue(externalApiService.getClinicsByLocation(city), Object.class);
            }
        }

        // ── BOOK_APPOINTMENT_SERVICE ───────────────────────────────────────────
        if ("BOOK_APPOINTMENT_SERVICE".equals(service)) {

            if ("GET_AVAILABLE_SLOTS".equals(operation)) {
                String doctorId = str(resolveRef(str(request.getOrDefault("doctorId", "")), ctx));
                String date     = str(resolveRef(str(request.getOrDefault("date",     "")), ctx));
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
                String userId = str(resolveRef(str(request.getOrDefault("userId", "")), ctx));
                String date   = str(resolveRef(str(request.getOrDefault("date",   "")), ctx));
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

            if ("GET_PATIENT_APPOINTMENTS".equals(operation)) {
                String clinicId      = str(resolveRef(str(request.getOrDefault("clinicId",     "")), ctx));
                String patientPhone  = str(resolveRef(str(request.getOrDefault("patientPhone", "")), ctx));
                return objectMapper.convertValue(
                        externalApiService.getPatientAppointments(clinicId, patientPhone), List.class);
            }

            if ("CANCEL_APPOINTMENT_BY_REF".equals(operation)) {
                String ref = str(resolveRef(str(request.getOrDefault("ref", "")), ctx));
                return objectMapper.convertValue(
                        externalApiService.cancelAppointmentByRef(ref), Object.class);
            }
        }

        if ("GOOGLE_CALENDAR".equals(service) && "CREATE_REMINDER".equals(operation)) {
            return Map.of("status", "SKIPPED", "reason", "Use GENERATE_CALENDAR_LINK action instead");
        }

        return Map.of("status", "UNSUPPORTED_ACTION", "service", service, "operation", operation);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private Object resolveRef(String expression, Map<String, Object> ctx) {
        if (expression == null || !expression.startsWith("context.")) return expression;
        String[] parts = expression.substring("context.".length()).split("\\.");
        Object current = ctx;
        for (String part : parts) {
            if (!(current instanceof Map<?, ?> map)) return null;
            current = ((Map<String, Object>) map).get(part);
            if (current == null) return null;
        }
        return current;
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    @SuppressWarnings("unchecked")
    private String getDoctorNameFromContext(Map<String, Object> ctx) {
        Object sel = ctx.get("selected_doctor");
        if (sel instanceof Map<?, ?> m) {
            Object n = ((Map<String, Object>) m).get("name");
            if (n != null) return str(n);
        }
        Object profile = ctx.get("profile");
        if (profile instanceof Map<?, ?> m) {
            Object n = ((Map<String, Object>) m).get("name");
            if (n != null) return str(n);
        }
        return "Doctor";
    }

    @SuppressWarnings("unchecked")
    private String getClinicNameFromContext(Map<String, Object> ctx) {
        Object profile = ctx.get("profile");
        if (profile instanceof Map<?, ?> m) {
            Map<String, Object> pm = (Map<String, Object>) m;
            if (pm.get("clinicName") != null) return str(pm.get("clinicName"));
            if (pm.get("name")       != null) return str(pm.get("name"));
        }
        return "Clinic";
    }
}


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


