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

        String clientName    = extractClientName(context);
        String doctorList    = formatDoctorList(context);
        String slotList      = formatSlots(context);
        String clinicList    = formatClinicList(context);
        String report        = formatReport(context);
        String ticketId      = context.getOrDefault("ticketId",      "").toString();
        String calendarLink  = context.getOrDefault("calendar_link", "").toString();
        String patientName   = context.getOrDefault("patient_name",  "").toString();
        String purpose       = context.getOrDefault("purpose",       "").toString();
        String apptList      = formatAppointmentList(context);

        return template
                .replace("{ClientName}",       clientName)
                .replace("{list of doctor}",   doctorList)
                .replace("{slots}",            slotList)
                .replace("{clinic_list}",      clinicList)
                .replace("{report}",           report)
                .replace("{ticketId}",         ticketId)
                .replace("{calendar_link}",    calendarLink)
                .replace("{patient_name}",     patientName)
                .replace("{purpose}",          purpose)
                .replace("{appointment_list}", apptList);
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
        // ① New clinic-based flows: doctors fetched directly into context.doctors
        Object doctorsObj = ctx.get("doctors");

        // ② Legacy DOCTOR_FLOW: doctors come from context.profile.doctors
        if (!(doctorsObj instanceof List<?>)) {
            Object profileObj = ctx.get("profile");
            if (profileObj instanceof Map<?, ?> profile) {
                doctorsObj = ((Map<String, Object>) profile).get("doctors");
            }
        }

        if (!(doctorsObj instanceof List<?> doctors)) return "";

        List<String> rows = new ArrayList<>();
        int index = 1;
        for (Object doctorObj : doctors) {
            if (!(doctorObj instanceof Map<?, ?> doctorMapObj)) continue;
            Map<String, Object> doctorMap = (Map<String, Object>) doctorMapObj;
            String name = firstNonBlank(
                    doctorMap.get("name"),
                    doctorMap.get("fullName"),
                    doctorMap.get("doctorName"),
                    doctorMap.get("_id")
            );
            String spec = doctorMap.get("specialization") != null
                    ? " (" + doctorMap.get("specialization") + ")" : "";
            rows.add(index + ". " + name + spec);
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

    /**
     * Formats context.patient_appointments list for the cancel flow.
     */
    @SuppressWarnings("unchecked")
    private String formatAppointmentList(Map<String, Object> ctx) {
        Object apptObj = ctx.get("patient_appointments");
        if (!(apptObj instanceof List<?> list)) return "No appointments found.";
        List<String> rows = new ArrayList<>();
        int i = 1;
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> m)) continue;
            Map<String, Object> a = (Map<String, Object>) m;
            String ref    = firstNonBlank(a.get("appointmentNumber"), a.get("_id"));
            String date   = firstNonBlank(a.get("appointmentDate"),   a.get("date"));
            String slot   = firstNonBlank(a.get("slot"),              a.get("startTime"));
            String status = firstNonBlank(a.get("status"), "BOOKED");
            rows.add(i++ + ". " + ref + " | " + date + " " + slot + " | " + status);
        }
        return rows.isEmpty() ? "No upcoming appointments found." : String.join("\n", rows);
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

    /**
     * Formats context.clinics (list of clinic/doctor maps) as a numbered list.
     * Used for {clinic_list} substitution in CLINIC_FINDER_FLOW messages.
     */
    @SuppressWarnings("unchecked")
    private String formatClinicList(Map<String, Object> ctx) {
        Object clinicsObj = ctx.get("clinics");
        if (!(clinicsObj instanceof List<?> clinics)) return "";
        List<String> rows = new ArrayList<>();
        int i = 1;
        for (Object item : clinics) {
            if (!(item instanceof Map<?, ?> m)) continue;
            Map<String, Object> doc = (Map<String, Object>) m;
            String name = firstNonBlank(doc.get("name"), doc.get("fullname"), doc.get("clinicName"), doc.get("_id"));
            String city = firstNonBlank(doc.get("city"), doc.get("address"));
            rows.add(i++ + ". " + name + (city.isBlank() ? "" : " (" + city + ")"));
        }
        return String.join("\n", rows);
    }

    /**
     * Formats context.report (list of appointment maps) as a summary.
     * Used for {report} substitution in DOCTOR_HELP_FLOW messages.
     */
    @SuppressWarnings("unchecked")
    private String formatReport(Map<String, Object> ctx) {
        Object reportObj = ctx.get("report");
        if (reportObj == null) return "No data available.";
        List<Map<String, Object>> appts = new ArrayList<>();
        if (reportObj instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> m) appts.add((Map<String, Object>) m);
            }
        }
        if (appts.isEmpty()) return "No appointments found.";
        List<String> rows = new ArrayList<>();
        rows.add("Total: " + appts.size() + " appointment(s)");
        int i = 1;
        for (Map<String, Object> a : appts) {
            String patient = firstNonBlank(a.get("patientName"), a.get("patient"), a.get("phone"));
            String slot = firstNonBlank(a.get("slot"), a.get("startTime"), a.get("time"));
            String status = firstNonBlank(a.get("status"), "Booked");
            rows.add(i++ + ". " + patient + " | " + slot + " | " + status);
        }
        return String.join("\n", rows);
    }
}
