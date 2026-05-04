package com.arnan.book_appointment.service;
 
import com.arnan.book_appointment.exception.AppointmentNotFoundException;

import com.arnan.book_appointment.repository.AppointmentRepository;

import com.arnan.book_appointment.util.AppointmentNumberGenerator;
 
import org.bson.Document;

import org.bson.types.ObjectId;

import org.springframework.stereotype.Service;
 
import java.time.LocalDate;

import java.time.LocalDateTime;

import java.util.List;
 
@Service

public class AppointmentService {
 
    private final AppointmentRepository repository;

    private final AppointmentNumberGenerator numberGenerator;
 
    public AppointmentService(AppointmentRepository repository,

                              AppointmentNumberGenerator numberGenerator) {

        this.repository = repository;

        this.numberGenerator = numberGenerator;

    }
 
    // ================= CREATE =================

    public Document create(Document appointment) {
 
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
 
        return appointment;

    }
 
    // ================= UPDATE =================

    public Document update(String id, Document updated) {
 
        Document existing = repository.findById(new ObjectId(id));
 
        if (existing == null) {

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
 
        Document existing = repository.findById(new ObjectId(id));
 
        if (existing == null) {

            throw new AppointmentNotFoundException("Data not found");

        }
 
        repository.delete(new ObjectId(id));

    }
 
    // ================= GET BY ID =================

    public Document getById(String id) {
 
        Document doc = repository.findById(new ObjectId(id));
 
        if (doc == null) {

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
 