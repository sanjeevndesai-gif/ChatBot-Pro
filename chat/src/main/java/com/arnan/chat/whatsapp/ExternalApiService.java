package com.arnan.chat.whatsapp;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;

@Service
public class ExternalApiService {

    private final WebClient webClient;

    @Value("${doctor.service.url}")
    private String doctorServiceUrl;

    @Value("${slot.service.url}")
    private String slotServiceUrl;

    public ExternalApiService(WebClient webClient) {
        this.webClient = webClient;
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
                doctorServiceUrl,
                "/api/doctors",
                null
        );
    }

    /**
     * Call Slot Microservice
     */
    public JsonNode getSlots(String date, String doctorId) {

        Map<String, String> params = Map.of(
                "date", date,
                "doctorId", doctorId
        );

        return callGetApi(
                slotServiceUrl,
                "/api/slots",
                params
        );
    }
}