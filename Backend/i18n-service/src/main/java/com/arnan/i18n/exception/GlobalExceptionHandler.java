package com.arnan.i18n.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import jakarta.servlet.http.HttpServletRequest;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleAll(Exception ex, HttpServletRequest req) {
        log.error("Exception in {} {}: {}", req.getMethod(), req.getRequestURI(), ex.getMessage());

        ApiErrorResponse error = new ApiErrorResponse(
                "Internal Server Error",
                ex.getMessage()
        );

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
