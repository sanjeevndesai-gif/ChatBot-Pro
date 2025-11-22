package com.arnan.i18n.exception;

import java.time.Instant;

public class ApiErrorResponse {
    private Instant timestamp = Instant.now();
    private String message;
    private String details;

    public ApiErrorResponse(String message, String details) {
        this.message = message;
        this.details = details;
    }

    public Instant getTimestamp() { return timestamp; }
    public String getMessage() { return message; }
    public String getDetails() { return details; }
}
