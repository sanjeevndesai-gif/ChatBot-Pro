package com.arnan.book_appointment.controller;

import com.arnan.book_appointment.service.AppointmentService;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private static final Logger log = LoggerFactory.getLogger(AppointmentController.class);

    private final AppointmentService service;

    public AppointmentController(AppointmentService service) {
        this.service = service;
    }

    // ================= CREATE =================
    @PostMapping
    public ResponseEntity<Document> create(@RequestBody Document appointment) {
        log.info("POST /api/appointments - create: {}", appointment);
        return ResponseEntity.ok(service.create(appointment));
    }

    // ================= UPDATE =================
    @PutMapping("/{id}")
    public ResponseEntity<Document> update(
            @PathVariable String id,
            @RequestBody Document appointment
    ) {
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

    // ================= GET BY DATE RANGE =================
    @GetMapping("/range")
    public ResponseEntity<List<Document>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        log.info("GET /api/appointments/range?from={}&to={}", from, to);
        return ResponseEntity.ok(service.getByDateRange(from, to));
    }
}
