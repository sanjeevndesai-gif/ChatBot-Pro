package com.arnan.auth.controller;

import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.arnan.auth.security.JwtUtil;
import com.arnan.auth.service.AdminService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private AdminService adminService;

    @Autowired
    private JwtUtil jwtUtil;

    // List pending approvals (legacy, keep for API parity) - returns same shape as /approvals/queue
    @GetMapping("/approvals")
    public ResponseEntity<?> listApprovals(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "10") int size) {
        log.info("/admin/approvals called; page={} size={}", page, size);
        if (authHeader == null || authHeader.isBlank()) {
            log.warn("Missing Authorization header for /admin/approvals");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Missing Authorization header"));
        }
        String token = authHeader.replace("Bearer ", "");
        String roleClaim = jwtUtil.extractClaim(token, c->c.get("role", String.class));
        log.debug("roleClaim={} for /admin/approvals", roleClaim);
        java.util.List<?> rolesClaim = jwtUtil.extractClaim(token, c->c.get("roles", java.util.List.class));
        boolean isAdminRole = false;
        if (roleClaim != null && "admin".equalsIgnoreCase(roleClaim)) isAdminRole = true;
        if (!isAdminRole && rolesClaim != null) {
            isAdminRole = rolesClaim.stream().anyMatch(r -> r != null && "admin".equalsIgnoreCase(r.toString()));
        }
        if (!jwtUtil.validateToken(token)) {
            log.warn("Invalid/expired token for /admin/approvals");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid or expired token"));
        }
        if (!isAdminRole) {
            log.warn("User not admin for /admin/approvals: roleClaim={} rolesClaim={}", roleClaim, rolesClaim);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        List<Document> content = adminService.listPendingApprovals(page, size);
        long total = adminService.countPendingApprovals();
        return ResponseEntity.ok(Map.of("content", content, "total", total));
    }

    // Frontend expects a paged /approvals/queue endpoint returning { content, total }
    @GetMapping("/approvals/queue")
    public ResponseEntity<?> approvalsQueue(@RequestHeader(value = "Authorization", required = false) String authHeader,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        log.info("/admin/approvals/queue called; page={} size={}", page, size);
        if (authHeader == null || authHeader.isBlank()) {
            log.warn("Missing Authorization header for /admin/approvals/queue");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Missing Authorization header"));
        }
        String token = authHeader.replace("Bearer ", "");
        String roleClaim = jwtUtil.extractClaim(token, c->c.get("role", String.class));
        log.debug("roleClaim={} for /admin/approvals/queue", roleClaim);
        java.util.List<?> rolesClaim = jwtUtil.extractClaim(token, c->c.get("roles", java.util.List.class));
        boolean isAdminRole = false;
        if (roleClaim != null && "admin".equalsIgnoreCase(roleClaim)) isAdminRole = true;
        if (!isAdminRole && rolesClaim != null) {
            isAdminRole = rolesClaim.stream().anyMatch(r -> r != null && "admin".equalsIgnoreCase(r.toString()));
        }
        if (!jwtUtil.validateToken(token)) {
            log.warn("Invalid/expired token for /admin/approvals/queue");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid or expired token"));
        }
        if (!isAdminRole) {
            log.warn("User not admin for /admin/approvals/queue: roleClaim={} rolesClaim={}", roleClaim, rolesClaim);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        List<Document> content = adminService.listPendingApprovals(page, size);
        long total = adminService.countPendingApprovals();
        return ResponseEntity.ok(Map.of("content", content, "total", total));
    }

    @PostMapping("/approvals/{userId}/approve")
    public ResponseEntity<?> approve(@RequestHeader("Authorization") String authHeader,
                                     @PathVariable String userId,
                                     @RequestBody(required = false) Map<String, Object> body) {
        String token = authHeader.replace("Bearer ", "");
        String roleClaim = jwtUtil.extractClaim(token, c->c.get("role", String.class));
        java.util.List<?> rolesClaim = jwtUtil.extractClaim(token, c->c.get("roles", java.util.List.class));
        boolean isAdminRole = false;
        if (roleClaim != null && "admin".equalsIgnoreCase(roleClaim)) isAdminRole = true;
        if (!isAdminRole && rolesClaim != null) {
            isAdminRole = rolesClaim.stream().anyMatch(r -> r != null && "admin".equalsIgnoreCase(r.toString()));
        }
        if (!jwtUtil.validateToken(token) || !isAdminRole) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        String adminUserId = jwtUtil.extractUserId(token);
        Document updated = adminService.approveUser(userId, body, adminUserId);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/approvals/{userId}/reject")
    public ResponseEntity<?> reject(@RequestHeader("Authorization") String authHeader,
                                    @PathVariable String userId,
                                    @RequestBody Map<String, Object> body) {
        String token = authHeader.replace("Bearer ", "");
        if (!jwtUtil.validateToken(token) || !"admin".equalsIgnoreCase(jwtUtil.extractClaim(token, c->c.get("role", String.class)))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        String adminUserId = jwtUtil.extractUserId(token);
        String reason = body != null ? (String) body.getOrDefault("reason", "") : "";
        adminService.rejectUser(userId, reason, adminUserId);
        return ResponseEntity.ok(Map.of("message", "rejected"));
    }

    // Match frontend: POST /admin/clinics/{id}/action
    @PostMapping("/clinics/{id}/action")
    public ResponseEntity<?> clinicAction(@RequestHeader("Authorization") String authHeader,
                                          @PathVariable String id,
                                          @RequestBody Map<String, Object> body) {
        String token = authHeader.replace("Bearer ", "");
        if (!jwtUtil.validateToken(token) || !"admin".equalsIgnoreCase(jwtUtil.extractClaim(token, c->c.get("role", String.class)))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        String adminUserId = jwtUtil.extractUserId(token);
        String action = body != null ? (String) body.getOrDefault("action", "") : "";
        if ("approve".equalsIgnoreCase(action)) {
            Document updated = adminService.approveUser(id, body, adminUserId);
            return ResponseEntity.ok(updated);
        } else if ("reject".equalsIgnoreCase(action)) {
            String reason = body != null ? (String) body.getOrDefault("reason", "") : "";
            adminService.rejectUser(id, reason, adminUserId);
            return ResponseEntity.ok(Map.of("message", "rejected"));
        } else {
            adminService.recordAction(id, action, body, adminUserId);
            return ResponseEntity.ok(Map.of("message", "recorded"));
        }
    }

    @GetMapping("/metrics/overview")
    public ResponseEntity<?> overview(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String roleClaim = jwtUtil.extractClaim(token, c->c.get("role", String.class));
        java.util.List<?> rolesClaim = jwtUtil.extractClaim(token, c->c.get("roles", java.util.List.class));
        boolean isAdminRole = false;
        if (roleClaim != null && "admin".equalsIgnoreCase(roleClaim)) isAdminRole = true;
        if (!isAdminRole && rolesClaim != null) {
            isAdminRole = rolesClaim.stream().anyMatch(r -> r != null && "admin".equalsIgnoreCase(r.toString()));
        }
        if (!jwtUtil.validateToken(token) || !isAdminRole) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Forbidden"));
        }
        Map<String, Object> out = adminService.getOverview();
        return ResponseEntity.ok(out);
    }
}
