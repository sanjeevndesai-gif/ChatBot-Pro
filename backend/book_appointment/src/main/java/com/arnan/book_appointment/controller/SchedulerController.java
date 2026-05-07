package com.arnan.book_appointment.controller;

import com.arnan.book_appointment.service.SchedulerService;
import org.bson.Document;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schedulers")
public class SchedulerController {

    private final SchedulerService service;

    public SchedulerController(SchedulerService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<Document> create(@RequestBody Document scheduler) {
        return ResponseEntity.ok(service.create(scheduler));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Document> update(@PathVariable String id,
                                           @RequestBody Document scheduler) {
        return ResponseEntity.ok(service.update(id, scheduler));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Document> getById(@PathVariable String id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<Document>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }
}