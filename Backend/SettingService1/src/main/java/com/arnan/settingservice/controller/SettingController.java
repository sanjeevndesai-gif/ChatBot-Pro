package com.arnan.settingservice.controller;

import com.arnan.settingservice.service.SettingService;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@Validated
public class SettingController {

    private static final Logger log = LoggerFactory.getLogger(SettingController.class);

    private final SettingService settingService;

    public SettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> welcome() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Welcome to Setting Service API");
        response.put("version", "1.0");
        response.put("endpoints", new String[]{
                "GET /api/settings/{userId}",
                "PUT /api/settings/{userId}",
                "PATCH /api/settings/{userId}/{key}",
                "DELETE /api/settings/{userId}"
        });
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> saveSettings(
            @PathVariable @NotBlank String userId,
            @RequestBody Map<String, Object> payload) {

        log.info("PUT /api/settings/{} called", userId);
        Map<String, Object> response = settingService.saveSettings(userId, payload);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> getSettings(
            @PathVariable @NotBlank String userId) {

        log.info("GET /api/settings/{} called", userId);
        Map<String, Object> response = settingService.getSettings(userId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{userId}/{key}")
    public ResponseEntity<Map<String, Object>> updateSingleField(
            @PathVariable @NotBlank String userId,
            @PathVariable @NotBlank String key,
            @RequestBody Map<String, Object> body) {

        log.info("PATCH /api/settings/{}/{} called", userId, key);

        if (!body.containsKey("value")) {
            throw new IllegalArgumentException("Request body must contain 'value'");
        }

        Map<String, Object> response = settingService.updateField(userId, key, body.get("value"));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, Object>> deleteSettings(
            @PathVariable @NotBlank String userId) {

        log.info("DELETE /api/settings/{} called", userId);

        settingService.deleteSettings(userId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Settings deleted successfully");
        response.put("userId", userId);

        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}