package com.arnan.book_appointment.controller;

import com.arnan.book_appointment.service.AppointmentService;
import org.bson.Document;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService service;

    public AppointmentController(AppointmentService service) {
        this.service = service;
    }

    // ================= CREATE =================
    @PostMapping
    public ResponseEntity<Document> create(@RequestBody Document appointment) {
        return ResponseEntity.ok(service.create(appointment));
    }

    // ================= UPDATE =================
    @PutMapping("/{id}")
    public ResponseEntity<Document> update(
            @PathVariable String id,
            @RequestBody Document appointment
    ) {
        return ResponseEntity.ok(service.update(id, appointment));
    }

    // ================= DELETE =================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable String id) {
        service.cancel(id);
        return ResponseEntity.noContent().build();
    }

    // ================= GET BY ID =================
    @GetMapping("/{id}")
    public ResponseEntity<Document> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // ================= GET ALL =================
    @GetMapping
    public ResponseEntity<List<Document>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    // ================= GET BY DATE RANGE =================
    @GetMapping("/range")
    public ResponseEntity<List<Document>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(service.getByDateRange(from, to));
    }
}