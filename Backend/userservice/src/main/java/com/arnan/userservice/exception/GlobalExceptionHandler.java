package com.arnan.userservice.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
 
    @ExceptionHandler(ServiceException.class)
    public ResponseEntity<?> handleServiceException(ServiceException ex) {

        log.error("ServiceException: {}", ex.getMessage());

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(Map.of(
                        "success", false,
                        "message", ex.getMessage(),
                        "timestamp", LocalDateTime.now()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex) {

        log.error("Unhandled Exception", ex);

        return ResponseEntity
                .status(500)
                .body(Map.of(
                        "success", false,
                        "message", "Internal server error",
                        "timestamp", LocalDateTime.now()
                ));
    }
}