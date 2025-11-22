package com.arnan.auth.controller;

import com.arnan.auth.model.User;
import com.arnan.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger LOGGER = Logger.getLogger(AuthController.class.getName());
    private static final String API_KEY = "SECRET-123";

    @Autowired
    private AuthService authService;

    private boolean isAuthorized(String key) {
        return API_KEY.equals(key);
    }

    /* ----------------------------------------------------
                       SIGNUP
    ---------------------------------------------------- */
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(
            @RequestHeader("X-API-KEY") String apiKey,
            @RequestBody User user) {

        if (!isAuthorized(apiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid API Key"));
        }

        try {
            String result = authService.registerUser(user);
            return ResponseEntity.ok(Map.of("message", result));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Registration failed"));
        }
    }

    /* ----------------------------------------------------
                       LOGIN (EMAIL + MOBILE)
    ---------------------------------------------------- */
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(
            @RequestHeader("X-API-KEY") String apiKey,
            @RequestBody Map<String, String> body) {

        if (!isAuthorized(apiKey)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid API Key"));
        }

        try {
            String identifier = body.get("identifier"); // email or phone
            String password = body.get("password");

            String result = authService.loginUser(identifier, password);

            if (result.equals("Login successful")) {
                return ResponseEntity.ok(Map.of(
                        "status", "success",
                        "message", result
                ));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "status", "error",
                                "message", result
                        ));
            }

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Login failed"));
        }
    }
}
