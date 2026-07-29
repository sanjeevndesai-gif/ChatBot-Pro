package com.arnan.chat.whatsapp;

import java.util.Map;

import com.arnan.chat.config.ChatProperties;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class ExternalApiService {

    private final WebClient webClient;
    private final ChatProperties.External props;

    public ExternalApiService(WebClient webClient, ChatProperties props) {
        this.webClient = webClient;
        this.props = props.getExternal();
    }

    /**
     * Generic GET API caller
     */
    public JsonNode callGetApi(String baseUrl,
                               String endpoint,
                               Map<String, String> queryParams) {

        return webClient.get()
                .uri(uriBuilder -> {

                    uriBuilder = uriBuilder.path(baseUrl + endpoint);

                    if (queryParams != null) {
                        queryParams.forEach(uriBuilder::queryParam);
                    }

                    return uriBuilder.build();
                })
                .retrieve()
                .onStatus(status -> status.isError(),
                        response -> response.bodyToMono(String.class)
                                .map(errorBody ->
                                        new RuntimeException("External API Error: " + errorBody)))
                .bodyToMono(JsonNode.class)
                .block();
    }

    /**
     * Generic POST API caller
     */
    public JsonNode callPostApi(String baseUrl,
                                String endpoint,
                                Object body) {

        return webClient.post()
                .uri(uriBuilder -> uriBuilder.path(baseUrl + endpoint).build())
                .bodyValue(body)
                .retrieve()
                .onStatus(status -> status.isError(),
                        response -> response.bodyToMono(String.class)
                                .map(errorBody ->
                                        new RuntimeException("External API Error: " + errorBody)))
                .bodyToMono(JsonNode.class)
                .block();
    }

    public JsonNode getUserProfile(String userId) {
        return callGetApi(
                props.getDoctorServiceUrl(),
                "/auth-service/find/" + userId,
                null
        );
    }

    /**
     * Call SchedulerController getById and return available slots for a doctor on a date.
     */
    public JsonNode getSlots(String date, String doctorId) {

        JsonNode scheduler = callGetApi(
                props.getSlotServiceUrl(),
                "/api/schedulers/" + doctorId,
                null
        );

        if (scheduler == null || !scheduler.has("daySlots") || !scheduler.get("daySlots").isArray()) {
            return null;
        }

        for (JsonNode daySlot : scheduler.get("daySlots")) {
            if (date.equals(daySlot.path("date").asText()) && !daySlot.path("unavailable").asBoolean(false)) {
                return daySlot;
            }
        }

        return null;
    }

    public JsonNode createAppointment(Map<String, Object> payload) {
        return callPostApi(
                props.getSlotServiceUrl(),
                "/api/appointments",
                payload
        );
    }

    /**
     * Returns all doctors from auth-service (role=doctor).
     */
    public JsonNode getAllDoctors() {
        return callGetApi(props.getDoctorServiceUrl(), "/auth-service/findall", null);
    }

    /**
     * Returns doctors belonging to a specific clinic (createdBy = clinicId, role = doctor).
     * Requires GET /auth-service/doctors?clinicId= in auth-service.
     */
    public JsonNode getDoctorsByClinic(String clinicId) {
        return callGetApi(props.getDoctorServiceUrl(), "/auth-service/doctors",
                Map.of("clinicId", clinicId));
    }

    /**
     * Returns doctors whose address/city matches the given city string.
     */
    public JsonNode getClinicsByLocation(String city) {
        return callGetApi(props.getDoctorServiceUrl(), "/auth-service/clinics",
                Map.of("city", city));
    }

    /**
     * Fetches appointments for a doctor on a specific date.
     */
    public JsonNode getAppointmentReport(String doctorId, String date) {
        return callGetApi(props.getSlotServiceUrl(), "/api/appointments/clinic",
                Map.of("userId", doctorId, "date", date));
    }

    /**
     * Saves a new schedule via POST /api/schedulers.
     */
    public JsonNode saveSchedule(Map<String, Object> payload) {
        return callPostApi(props.getSlotServiceUrl(), "/api/schedulers", payload);
    }

    /**
     * Returns appointments for a patient phone within a specific clinic.
     * Requires GET /api/appointments/patient?phone=&clinicId= in book_appointment.
     */
    public JsonNode getPatientAppointments(String clinicId, String patientPhone) {
        return callGetApi(props.getSlotServiceUrl(), "/api/appointments/patient",
                Map.of("clinicId", clinicId, "phone", patientPhone));
    }

    /**
     * Returns the patient's next upcoming appointment for a clinic.
     * Requires GET /api/appointments/upcoming?phone=&clinicId= in book_appointment.
     */
    public JsonNode getUpcomingAppointment(String clinicId, String patientPhone) {
        return callGetApi(props.getSlotServiceUrl(), "/api/appointments/upcoming",
                Map.of("clinicId", clinicId, "phone", patientPhone));
    }

    /**
     * Finds a staff/doctor user by phone. Used by STAFF_FLOW authentication.
     * Requires GET /auth-service/find-by-phone?phone= in auth-service.
     */
    public JsonNode findStaffByPhone(String phone) {
        return callGetApi(props.getDoctorServiceUrl(), "/auth-service/find-by-phone",
                Map.of("phone", phone));
    }

    /** Returns the clinic portal URL from configuration. */
    public String getPortalUrl() {
        return props.getPortalUrl();
    }

    /**
     * Cancels an appointment identified by its appointmentNumber reference.
     * Requires DELETE /api/appointments/by-ref?ref= in book_appointment.
     */
    public JsonNode cancelAppointmentByRef(String appointmentNumber) {
        return webClient.delete()
                .uri(uriBuilder -> uriBuilder
                        .path(props.getSlotServiceUrl() + "/api/appointments/by-ref")
                        .queryParam("ref", appointmentNumber)
                        .build())
                .retrieve()
                .onStatus(status -> status.isError(),
                        response -> response.bodyToMono(String.class)
                                .map(body -> new RuntimeException("Cancel error: " + body)))
                .bodyToMono(JsonNode.class)
                .block();
    }
}