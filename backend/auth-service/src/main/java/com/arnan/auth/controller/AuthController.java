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
import com.arnan.auth.service.PlanService;

import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

import com.arnan.auth.security.JwtUtil;

@RestController
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserManagementService userManagementService;

    @Autowired
    private BillingService billingService;

    @Autowired
    private PlanService planService;

    @Autowired
    private JwtUtil jwtUtil;

    @Value("${chat.service.url:http://localhost:8082}")
    private String chatServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    // ─── Billing endpoints ─────────────────────────────────────────────

    @GetMapping("/billing/{mongoId}")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> getBilling(@PathVariable String mongoId) {
        return billingService.getBilling(mongoId);
    }

    @PutMapping("/billing/{mongoId}/upgrade")
    @ResponseStatus(HttpStatus.OK)
    public void upgradePlan(@PathVariable String mongoId, @RequestBody Map<String, Object> body) {
        // Prefer new payload: { planCode, billingCycle } optionally with price.
        if (body.containsKey("planCode") && body.containsKey("billingCycle")) {
            String planCode = ((String) body.get("planCode")).toUpperCase();
            String billingCycle = (String) body.get("billingCycle");
            Integer price = body.containsKey("price") ? ((Number) body.get("price")).intValue() : null;
            billingService.upgradePlanByCode(mongoId, planCode, billingCycle, price);
            return;
        }

        // Fallback to legacy payload for compatibility
        String planName = (String) body.getOrDefault("planName", "Basic");
        int planPrice = body.containsKey("planPrice") ? ((Number) body.get("planPrice")).intValue() : 0;
        billingService.upgradePlan(mongoId, planName, planPrice);
    }

    @PutMapping("/billing/{mongoId}/deactivate")
    @ResponseStatus(HttpStatus.OK)
    public void deactivateUser(@PathVariable String mongoId) {
        billingService.deactivateUser(mongoId);
    }

    @PostMapping("/billing/{mongoId}/history")
    @ResponseStatus(HttpStatus.CREATED)
    public void addBillingHistory(@PathVariable String mongoId, @RequestBody Map<String, Object> body) {
        billingService.addBillingHistory(mongoId, body);
    }

    // Alternate invoice endpoint to avoid static resource handler conflicts
    @PostMapping("/billing/invoice/{mongoId}")
    @ResponseStatus(HttpStatus.CREATED)
    public void addBillingInvoice(@PathVariable String mongoId, @RequestBody Map<String, Object> body) {
        billingService.addBillingHistory(mongoId, body);
    }

    @GetMapping("/billing/invoice/{mongoId}")
    @ResponseStatus(HttpStatus.OK)
    public List<Object> getBillingInvoice(@PathVariable String mongoId) {
        return billingService.getBillingHistory(mongoId).stream().map(m -> (Object) m).toList();
    }

    @PutMapping("/billing/backfill")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> backfillBilling() {
        int count = billingService.backfillMissingBilling();
        return Map.of("backfilled", count);
    }

    @GetMapping({"/plans", "/public/plans"})
    @ResponseStatus(HttpStatus.OK)
    public List<Object> listPlans() {
        return planService.getAllPlans().stream().map(d -> (Object) d).toList();
    }

    @PostMapping("/plans")
    @ResponseStatus(HttpStatus.CREATED)
    public void createPlan(@RequestBody Map<String, Object> body) {
        Document doc = new Document(body);
        planService.savePlan(doc);
    }

    @PutMapping("/plans/{planCode}")
    @ResponseStatus(HttpStatus.OK)
    public void updatePlan(@PathVariable String planCode, @RequestBody Map<String, Object> body) {
        Document doc = new Document(body);
        planService.updatePlanByCode(planCode, doc);
    }

    @DeleteMapping("/plans/{planCode}")
    @ResponseStatus(HttpStatus.OK)
    public void deletePlan(@PathVariable String planCode) {
        planService.deletePlanByCode(planCode);
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
    public ResponseEntity<?> login(@RequestBody Map<String, Object> body) {
        try {
            Map<String, Object> resp = authService.login(body);
            return ResponseEntity.ok(resp);
        } catch (RuntimeException e) {
            String msg = e.getMessage() == null ? "Login failed" : e.getMessage();
            // Translate pending-approval to a friendly 403 for the UI
            if (msg.toLowerCase().contains("pending admin approval") || msg.toLowerCase().contains("pending")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Registration received. Your account is waiting for admin approval. Our support team will contact you for verification."));
            }
            return ResponseEntity.badRequest().body(Map.of("message", msg));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Login service error"));
        }
    }

    /**
     * Forgot password via WhatsApp: Looks up user by email or phone, sends password to registered WhatsApp number using chat service.
     */
    @PostMapping("/forgot-password-whatsapp")
    public ResponseEntity<?> forgotPasswordWhatsApp(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        Map<String, Object> result = authService.handleForgotPasswordWhatsApp(identifier, chatServiceUrl, restTemplate);
        if ("OK".equals(result.get("status"))) {
            return ResponseEntity.ok(Map.of("message", result.get("message")));
        } else if ("User not found".equals(result.get("message"))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", result.get("message")));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", result.get("message")));
        }
    }

    /**
     * Return the current user based on the Authorization header (Bearer token).
     * Useful for other services to resolve org/clinic without parsing JWT locally.
     */
    @GetMapping("/profile/me")
    public ResponseEntity<?> getCurrentProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtUtil.extractUserId(token);
            if (userId == null || userId.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
            }
            Document user = authService.findById(userId);
            user.remove("password");
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Failed to resolve user"));
        }
    }

    // New endpoint: Get users by admin (createdBy)
    @GetMapping("/users/by-admin")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> getUsersByAdmin(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        String token = authHeader.replace("Bearer ", "");
        String adminUserId = jwtUtil.extractUserId(token);
        return userManagementService.getUsersByAdminPaginated(adminUserId, page, size, search);
    }

    /**
     * Find a user by phone number. Used by chat STAFF_FLOW authentication.
     * GET /auth-service/find-by-phone?phone={phone}
     */
    @GetMapping({ "/find-by-phone", "/auth-service/find-by-phone" })
    @ResponseStatus(HttpStatus.OK)
    public ResponseEntity<?> findByPhone(@RequestParam String phone) {
        try {
            Document user = authService.findByPhone(phone);
            if (user == null) return ResponseEntity.notFound().build();
            user.remove("password");
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error finding user by phone"));
        }
    }

    /**
     * Returns doctors belonging to a specific clinic (createdBy = clinicId, role = doctor).
     * Used by chat service APPOINTMENT_FLOW.
     * GET /auth-service/doctors?clinicId={clinicId}
     */
    @GetMapping({ "/doctors", "/auth-service/doctors" })
    @ResponseStatus(HttpStatus.OK)
    public List<Map<String, Object>> getDoctorsByClinic(
            @RequestParam(defaultValue = "") String clinicId) {
        return userManagementService.getDoctorsByClinic(clinicId);
    }

    /**
     * Returns doctors filtered by city/address — used by chat CLINIC_FINDER_FLOW.
     * GET /auth-service/clinics?city={city}
     */
    @GetMapping({ "/clinics", "/auth-service/clinics" })
    @ResponseStatus(HttpStatus.OK)
    public List<Map<String, Object>> getClinicsByCity(
            @RequestParam(defaultValue = "") String city) {
        return userManagementService.getClinicsByCity(city);
    }

    /**
     * Save current user's settings. Requires Authorization header.
     * Only available for paid plans (STANDARD, PREMIUM, PROPLUS).
     */
    @PutMapping("/profile/settings")
    public ResponseEntity<?> saveProfileSettings(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> body) {
        try {
            String token = authHeader.replace("Bearer ", "");
            String userId = jwtUtil.extractUserId(token);
            if (userId == null || userId.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid token"));
            }

            authService.saveSettingsForUserId(userId, body);
            return ResponseEntity.ok(Map.of("message", "Settings saved"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Failed to save settings"));
        }
    }
}
