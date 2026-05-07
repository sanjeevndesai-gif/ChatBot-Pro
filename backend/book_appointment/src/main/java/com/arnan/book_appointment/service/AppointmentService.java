package com.arnan.book_appointment.service;

import com.arnan.book_appointment.exception.AppointmentNotFoundException;
import com.arnan.book_appointment.repository.AppointmentRepository;
import com.arnan.book_appointment.util.AppointmentNumberGenerator;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AppointmentService {

    private static final Logger log = LoggerFactory.getLogger(AppointmentService.class);

    private final AppointmentRepository repository;
    private final AppointmentNumberGenerator numberGenerator;

    public AppointmentService(AppointmentRepository repository,
                              AppointmentNumberGenerator numberGenerator) {
        this.repository = repository;
        this.numberGenerator = numberGenerator;
    }

    // ================= CREATE =================
    public Document create(Document appointment) {
        log.info("Creating new appointment: {}", appointment);

        appointment.put("appointmentNumber", numberGenerator.generate());

        if (!appointment.containsKey("status")) {
            appointment.put("status", "BOOKED");
        }

        appointment.put("createdAt", LocalDateTime.now());
        appointment.put("updatedAt", LocalDateTime.now());

        repository.save(appointment);

        ObjectId id = appointment.getObjectId("_id");
        if (id != null) {
            appointment.put("id", id.toHexString());
        }

        log.info("Appointment created with id={}", appointment.getString("id"));
        return appointment;
    }

    // ================= UPDATE =================
    public Document update(String id, Document updated) {
        log.info("Updating appointment id={}", id);

        Document existing = repository.findById(new ObjectId(id));

        if (existing == null) {
            log.warn("Appointment not found for update: id={}", id);
            throw new AppointmentNotFoundException("Appointment not found with id: " + id);
        }

        updated.put("appointmentNumber", existing.getString("appointmentNumber"));
        updated.put("createdAt", existing.get("createdAt"));
        updated.put("updatedAt", LocalDateTime.now());

        repository.update(updated, new ObjectId(id));

        updated.put("id", id);

        return updated;
    }

    // ================= DELETE =================
    public void cancel(String id) {
        log.info("Canceling appointment id={}", id);

        Document existing = repository.findById(new ObjectId(id));

        if (existing == null) {
            log.warn("Cannot cancel appointment; not found id={}", id);
            throw new AppointmentNotFoundException("Data not found");
        }

        repository.delete(new ObjectId(id));
        log.info("Appointment canceled id={}", id);
    }

    // ================= GET BY ID =================
    public Document getById(String id) {
        log.info("Fetching appointment by id={}", id);

        Document doc = repository.findById(new ObjectId(id));

        if (doc == null) {
            log.warn("Appointment not found id={}", id);
            throw new AppointmentNotFoundException("Data not found");
        }

        ObjectId objectId = doc.getObjectId("_id");
        if (objectId != null) {
            doc.put("id", objectId.toHexString());
        }

        return doc;
    }

    // ================= GET ALL =================
    public List<Document> getAll() {
        return repository.getAll();
    }

    // ================= GET BY DATE RANGE =================
    public List<Document> getByDateRange(LocalDate from, LocalDate to) {
        return repository.findByDateRange(from, to);
    }
}