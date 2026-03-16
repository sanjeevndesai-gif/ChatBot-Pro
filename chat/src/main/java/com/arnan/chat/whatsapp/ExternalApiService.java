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
     * Call Doctor Microservice
     */
    public JsonNode getDoctors() {

        return callGetApi(
                props.getDoctorServiceUrl(),
                "/api/doctors",
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
}