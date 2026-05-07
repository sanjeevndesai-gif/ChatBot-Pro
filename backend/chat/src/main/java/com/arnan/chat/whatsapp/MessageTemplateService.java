package com.arnan.chat.whatsapp;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Service
public class MessageTemplateService {

    private final MongoTemplate mongo;

    public MessageTemplateService(MongoTemplate mongo) {
        this.mongo = mongo;
    }

    @SuppressWarnings("unchecked")
    public String render(String messageKey, Map<String, Object> convo) {
        if (messageKey == null || messageKey.isBlank()) {
            return "";
        }

        String template = findTemplateText(messageKey);
        if (template == null || template.isBlank()) {
            return messageKey;
        }

        Map<String, Object> context = convo == null
                ? Map.of()
                : (Map<String, Object>) convo.getOrDefault("context", Map.of());

        String clientName = extractClientName(context);
        String doctorList = formatDoctorList(context);
        String slotList = formatSlots(context);

        return template
                .replace("{ClientName}", clientName)
                .replace("{list of doctor}", doctorList)
                .replace("{slots}", slotList);
    }

    @SuppressWarnings("unchecked")
    private String findTemplateText(String key) {
        Query query = new Query(Criteria.where("key").is(key));

        Map<String, Object> doc = mongo.findOne(query, Map.class, "messages");
        if (doc == null) {
            doc = mongo.findOne(query, Map.class, "message_templates");
        }
        if (doc == null) {
            return null;
        }

        Object text = doc.get("value");
        if (text == null) {
            text = doc.get("template");
        }
        if (text == null) {
            text = doc.get("message");
        }
        if (text == null && doc.get("en") != null) {
            text = doc.get("en");
        }

        return text == null ? null : String.valueOf(text);
    }

    @SuppressWarnings("unchecked")
    private String extractClientName(Map<String, Object> ctx) {
        Object profileObj = ctx.get("profile");
        if (!(profileObj instanceof Map<?, ?> profile)) {
            return "";
        }

        Object clinicName = ((Map<String, Object>) profile).get("clinicName");
        return clinicName == null ? "" : String.valueOf(clinicName);
    }

    @SuppressWarnings("unchecked")
    private String formatDoctorList(Map<String, Object> ctx) {
        Object profileObj = ctx.get("profile");
        if (!(profileObj instanceof Map<?, ?> profile)) {
            return "";
        }

        Object doctorsObj = ((Map<String, Object>) profile).get("doctors");
        if (!(doctorsObj instanceof List<?> doctors)) {
            return "";
        }

        List<String> rows = new ArrayList<>();
        int index = 1;
        for (Object doctorObj : doctors) {
            if (!(doctorObj instanceof Map<?, ?> doctorMapObj)) {
                continue;
            }
            Map<String, Object> doctorMap = (Map<String, Object>) doctorMapObj;
            String name = firstNonBlank(
                    doctorMap.get("name"),
                    doctorMap.get("fullName"),
                    doctorMap.get("doctorName"),
                    doctorMap.get("_id")
            );
            rows.add(index + ". " + name);
            index++;
        }

        return String.join("\n", rows);
    }

    @SuppressWarnings("unchecked")
    private String formatSlots(Map<String, Object> ctx) {
        Object slotsObj = ctx.get("slots");
        List<Map<String, Object>> slots = new ArrayList<>();

        if (slotsObj instanceof Map<?, ?> slotContainerObj) {
            Map<String, Object> slotContainer = (Map<String, Object>) slotContainerObj;
            Object nested = slotContainer.get("slots");
            if (nested instanceof List<?> nestedList) {
                for (Object item : nestedList) {
                    if (item instanceof Map<?, ?> itemMapObj) {
                        slots.add((Map<String, Object>) itemMapObj);
                    }
                }
            }
        } else if (slotsObj instanceof List<?> slotList) {
            for (Object item : slotList) {
                if (item instanceof Map<?, ?> itemMapObj) {
                    slots.add((Map<String, Object>) itemMapObj);
                }
            }
        }

        List<String> rows = new ArrayList<>();
        int index = 1;
        for (Map<String, Object> slot : slots) {
            String start = firstNonBlank(slot.get("start"), slot.get("from"), slot.get("startTime"));
            String end = firstNonBlank(slot.get("end"), slot.get("to"), slot.get("endTime"));

            String label = end.isBlank() ? start : (start + " - " + end);
            rows.add(index + ". " + label);
            index++;
        }

        return String.join("\n", rows);
    }

    private String firstNonBlank(Object... values) {
        for (Object value : values) {
            if (value == null) {
                continue;
            }
            String text = String.valueOf(value).trim();
            if (!text.isBlank()) {
                return text;
            }
        }
        return "";
    }
}
