package com.arnan.book_appointment.controller;


import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.arnan.book_appointment.service.AppointmentService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private static final Logger log = LoggerFactory.getLogger(AppointmentController.class);

    private final AppointmentService service;

    public AppointmentController(AppointmentService service) {
        this.service = service;
    }

    private Document toDocument(Object payload) {
        if (payload == null) return new Document();
        if (payload instanceof Document) return (Document) payload;
        if (payload instanceof Map) return new Document((Map) payload);
        if (payload instanceof String) {
            try {
                return Document.parse((String) payload);
            } catch (Exception e) {
                return new Document("value", payload);
            }
        }
        return new Document("value", payload.toString());
    }

    // ================= CREATE =================
    @PostMapping
        public ResponseEntity<Document> create(
            @RequestBody Object appointmentPayload,
            @RequestHeader(name = "X-User-Id", required = false) String forwardedUserId,
            @RequestHeader(name = "Authorization", required = false) String authHeader) {

        Document appointment = toDocument(appointmentPayload);
        log.info("POST /api/appointments - create request forwardedUserId={}, auth present={}", forwardedUserId != null, authHeader != null);
        return ResponseEntity.ok(service.createWithInference(appointment, forwardedUserId, authHeader));
    }

    // ================= UPDATE =================
    @PutMapping("/{id}")
    public ResponseEntity<Document> update(
            @PathVariable String id,
            @RequestBody Object appointmentPayload
    ) {
        Document appointment = toDocument(appointmentPayload);
        log.info("PUT /api/appointments/{} - update: {}", id, appointment);
        return ResponseEntity.ok(service.update(id, appointment));
    }

    // ================= DELETE =================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable String id) {
        log.info("DELETE /api/appointments/{} - cancel", id);
        service.cancel(id);
        return ResponseEntity.noContent().build();
    }

    // ================= GET BY ID =================
    @GetMapping("/{id}")
    public ResponseEntity<Document> getById(@PathVariable String id) {
        log.info("GET /api/appointments/{}", id);
        return ResponseEntity.ok(service.getById(id));
    }

    // ================= GET ALL =================
    @GetMapping
    public ResponseEntity<List<Document>> getAll() {
        log.info("GET /api/appointments - list all");
        return ResponseEntity.ok(service.getAll());
    }

    // ================= GET FOR USER'S CLINIC =================
    @GetMapping("/clinic")
    public ResponseEntity<List<Document>> getForClinic(@RequestParam(required = false) String userId) {
        log.info("GET /api/appointments/clinic - userId={}", userId);
        return ResponseEntity.ok(service.getByClinicForUser(userId));
    }

    @GetMapping("/clinic/me")
    public ResponseEntity<List<Document>> getForClinicMe(
            @RequestHeader(name = "Authorization", required = false) String authHeader,
            @RequestHeader(name = "X-User-Id", required = false) String forwardedUserId) {
        log.info("GET /api/appointments/clinic/me - auth present={}, forwardedUserId={}", authHeader != null, forwardedUserId);
        return ResponseEntity.ok(service.getByClinicForToken(authHeader, forwardedUserId));
    }

    // ================= GET BY DATE RANGE =================
    @GetMapping("/range")
    public ResponseEntity<List<Document>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("GET /api/appointments/range?from={}&to={}", from, to);
        return ResponseEntity.ok(service.getByDateRange(from, to));
    }

    // ================= GET BY PATIENT PHONE (chat cancel flow) =================
    @GetMapping("/patient")
    public ResponseEntity<List<Document>> getByPatientPhone(
            @RequestParam String phone,
            @RequestParam(required = false, defaultValue = "") String clinicId) {
        log.info("GET /api/appointments/patient phone={} clinicId={}", phone, clinicId);
        return ResponseEntity.ok(service.getByPatientPhone(phone, clinicId));
    }

    // ================= CANCEL BY APPOINTMENT NUMBER (chat cancel flow) =================
    @DeleteMapping("/by-ref")
    public ResponseEntity<Void> cancelByRef(@RequestParam String ref) {
        log.info("DELETE /api/appointments/by-ref ref={}", ref);
        service.cancelByRef(ref);
        return ResponseEntity.noContent().build();
    }
}
