package com.arnan.book_appointment.service;

import com.arnan.book_appointment.exception.AppointmentNotFoundException;
import com.arnan.book_appointment.repository.SchedulerRepository;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SchedulerService {

    private final SchedulerRepository repository;

    public SchedulerService(SchedulerRepository repository) {
        this.repository = repository;
    }

    public Document create(Document scheduler) {

        scheduler.put("createdAt", LocalDateTime.now());
        scheduler.put("updatedAt", LocalDateTime.now());

        repository.save(scheduler);

        ObjectId id = scheduler.getObjectId("_id");
        if (id != null) {
            scheduler.put("id", id.toHexString());
        }

        return scheduler;
    }

    public Document update(String id, Document scheduler) {

        Document existing = repository.findById(new ObjectId(id));

        if (existing == null)
            throw new AppointmentNotFoundException("Scheduler not found");

        scheduler.put("createdAt", existing.get("createdAt"));
        scheduler.put("updatedAt", LocalDateTime.now());

        repository.update(scheduler, new ObjectId(id));

        scheduler.put("id", id);

        return scheduler;
    }

    public void delete(String id) {

        Document existing = repository.findById(new ObjectId(id));

        if (existing == null)
            throw new AppointmentNotFoundException("Scheduler not found");

        repository.delete(new ObjectId(id));
    }

    public Document getById(String id) {

        Document doc = repository.findById(new ObjectId(id));

        if (doc == null)
            throw new AppointmentNotFoundException("Scheduler not found");

        ObjectId objectId = doc.getObjectId("_id");
        if (objectId != null) {
            doc.put("id", objectId.toHexString());
        }

        return doc;
    }

    public List<Document> getAll() {
        return repository.findAll();
    }
}