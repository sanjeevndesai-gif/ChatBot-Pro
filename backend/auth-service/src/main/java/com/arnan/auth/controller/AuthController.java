package com.arnan.auth.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.arnan.auth.service.AuthService;
import com.arnan.auth.service.UserManagementService;
import com.arnan.auth.service.BillingService;

@RestController
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserManagementService userManagementService;

    @Autowired
    private BillingService billingService;

    // ─── Billing endpoints ─────────────────────────────────────────────

    @GetMapping("/billing/{mongoId}")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> getBilling(@PathVariable String mongoId) {
        return billingService.getBilling(mongoId);
    }

    @PutMapping("/billing/{mongoId}/upgrade")
    @ResponseStatus(HttpStatus.OK)
    public void upgradePlan(@PathVariable String mongoId, @RequestBody Map<String, Object> body) {
        String planName = (String) body.getOrDefault("planName", "Basic");
        int planPrice = body.containsKey("planPrice") ? ((Number) body.get("planPrice")).intValue() : 0;
        billingService.upgradePlan(mongoId, planName, planPrice);
    }

    @PutMapping("/billing/{mongoId}/deactivate")
    @ResponseStatus(HttpStatus.OK)
    public void deactivateUser(@PathVariable String mongoId) {
        billingService.deactivateUser(mongoId);
    }

    @GetMapping("/users")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        return userManagementService.getUsersPaginated(page, size, search);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public void addUser(@RequestBody Map<String, Object> body) {
        userManagementService.addStaffUser(body);
    }

    @PutMapping("/users/{id}")
    @ResponseStatus(HttpStatus.OK)
    public void updateUser(@PathVariable String id, @RequestBody Map<String, Object> body) {
        userManagementService.updateStaffUser(id, body);
    }

    @PutMapping("/profile/{id}")
    @ResponseStatus(HttpStatus.OK)
    public void updateProfile(@PathVariable String id, @RequestBody Map<String, Object> body) {
        userManagementService.updateProfile(id, body);
    }

    @PutMapping("/change-password/{id}")
    public ResponseEntity<Map<String, String>> changePassword(
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {
        String currentPassword = (String) body.get("currentPassword");
        String newPassword = (String) body.get("newPassword");
        if (currentPassword == null || newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", "Invalid request: passwords required and new password must be at least 8 characters"));
        }
        try {
            userManagementService.changePassword(id, currentPassword, newPassword);
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping({ "/find/{id}", "/auth-service/find/{id}" })
    @ResponseStatus(HttpStatus.OK)
    public Document findById(@PathVariable String id) {
        return authService.findById(id);
    }

    @GetMapping({ "/findName", "/auth-service/findName" })
    @ResponseStatus(HttpStatus.OK)
    public Document findByName(
            @RequestParam String name,
            @RequestParam String orgId) {
        return authService.findByName(name, orgId);
    }

    @GetMapping({ "/findall", "/auth-service/findall" })
    @ResponseStatus(HttpStatus.OK)
    public List<Object> findAll() {
        return authService.getList();
    }

    // ✅ REGISTER - DO NOT CHANGE
    @PostMapping({ "/register", "/auth-service" })
    @ResponseStatus(HttpStatus.CREATED)
    public void create(@RequestBody Map<String, Object> body) {
        authService.save(body);
    }

    @PutMapping({ "/users", "/auth-service" })
    @ResponseStatus(HttpStatus.OK)
    public void update(
            @RequestBody Map<String, Object> body,
            @RequestParam String orgId,
            @RequestParam String id) {
        authService.update(body, orgId, id);
    }

    @DeleteMapping({ "/users/{id}", "/auth-service/delete/{id}" })
    @ResponseStatus(HttpStatus.OK)
    public void delete(@PathVariable String id) {
        authService.delete(id);
    }

    // ✅ LOGIN
    @PostMapping({ "/login", "/auth-service/login" })
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> login(@RequestBody Map<String, Object> body) {
        return authService.login(body);
    }
}
