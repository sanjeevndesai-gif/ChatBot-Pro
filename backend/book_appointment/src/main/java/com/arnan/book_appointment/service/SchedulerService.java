package com.arnan.book_appointment.service;


import com.arnan.book_appointment.exception.AppointmentNotFoundException;
import com.arnan.book_appointment.repository.SchedulerRepository;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Service
public class SchedulerService {
    private final SchedulerRepository repository;

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);

    public SchedulerService(SchedulerRepository repository) {
        this.repository = repository;
    }

    public Document create(Document scheduler) {
        scheduler.put("createdAt", LocalDateTime.now());
        scheduler.put("updatedAt", LocalDateTime.now());
        repository.save(scheduler);

        ObjectId id = scheduler.getObjectId("_id");
        if (id != null) scheduler.put("id", id.toHexString());
        return scheduler;
    }

    public Document update(String id, Document scheduler) {
        Document existing = repository.findById(new ObjectId(id));
        if (existing == null) throw new AppointmentNotFoundException("Scheduler not found");

        scheduler.put("createdAt", existing.get("createdAt"));
        scheduler.put("updatedAt", LocalDateTime.now());

        repository.update(scheduler, new ObjectId(id));
        scheduler.put("id", id);
        return scheduler;
    }

    public void delete(String id) {
        Document existing = repository.findById(new ObjectId(id));
        if (existing == null) throw new AppointmentNotFoundException("Scheduler not found");
        repository.delete(new ObjectId(id));
    }

    public Document getById(String id) {
        Document doc = repository.findById(new ObjectId(id));
        if (doc == null) throw new AppointmentNotFoundException("Scheduler not found");
        ObjectId objectId = doc.getObjectId("_id");
        if (objectId != null) doc.put("id", objectId.toHexString());
        return doc;
    }

    public List<Document> getAll() {
        List<Document> schedulers = repository.findAll();
        for (Document doc : schedulers) {
            ObjectId objectId = doc.getObjectId("_id");
            if (objectId != null) doc.put("id", objectId.toHexString());
        }
        return schedulers;
    }

    /**
     * Retrieve schedulers that contain slots created by `createdBy`.
     * Delegates to repository and normalizes `_id` to `id`.
     */
    public List<Document> getAllByCreator(String createdBy) {
        List<Document> schedulers = repository.findBySlotCreator(createdBy);
        for (Document doc : schedulers) {
            ObjectId objectId = doc.getObjectId("_id");
            if (objectId != null) doc.put("id", objectId.toHexString());
        }
        return schedulers;
    }

    /**
     * Delete a single slot by slotId. If `date` is provided (YYYY-MM-DD), only
     * remove the slot instances that belong to that date. Handles both
     * resource-level `daySlots` and legacy scheduler-level `daySlots` shapes.
     */
    @SuppressWarnings("unchecked")
    public void deleteSlot(String schedulerId, String resourceId, String slotId, String date) {
        Document scheduler = repository.findById(new ObjectId(schedulerId));
        if (scheduler == null) throw new RuntimeException("Scheduler not found");

        // Debug presence of scheduler-level daySlots
        try {
            Object schedDaySlotsObj = scheduler.get("daySlots");
            if (schedDaySlotsObj instanceof List) {
                List<?> l = (List<?>) schedDaySlotsObj;
                log.debug("[SchedulerService] scheduler.level daySlots present, count={}", l.size());
            } else if (schedDaySlotsObj != null) {
                log.debug("[SchedulerService] scheduler.level daySlots present but not a list (type={})", schedDaySlotsObj.getClass().getName());
            } else {
                log.debug("[SchedulerService] scheduler.level daySlots missing");
            }
        } catch (Exception e) {
            log.debug("[SchedulerService] could not inspect scheduler.level daySlots", e);
        }

        List<?> resourceSchedules = (List<?>) scheduler.get("resourceSchedules");
        if (resourceSchedules == null) return;

        for (Object rsObj : resourceSchedules) {
            Document resourceSchedule = new Document((Map<String, Object>) rsObj);
            String dbResourceId = resourceSchedule.getString("resourceId");
            if (!resourceId.equals(dbResourceId)) continue;

            List<?> daySlots = (List<?>) resourceSchedule.get("daySlots");

            // Fallback to scheduler-level daySlots if resource-level missing
            if (daySlots == null) {
                List<?> schedDaySlots = (List<?>) scheduler.get("daySlots");
                if (schedDaySlots == null) continue;

                for (Object dayObj : schedDaySlots) {
                    String dayDateStr = extractDayDateStr(dayObj);
                    if (date != null) {
                        if (dayDateStr == null || !dayDateStr.equals(date)) {
                            if (dayObj instanceof Map && dayDateStr == null) log.warn("[SchedulerService] deleteSlot: day entry without 'date' keys={}", ((Map<?, ?>) dayObj).keySet());
                            continue;
                        }
                    }

                    List<?> slots = null;
                    if (dayObj instanceof Document) slots = (List<?>) ((Document) dayObj).get("slots");
                    else if (dayObj instanceof Map) slots = (List<?>) ((Map<?, ?>) dayObj).get("slots");
                    if (slots == null) continue;

                    slots.removeIf(slotObj -> {
                        Document slot = new Document((Map<String, Object>) slotObj);
                        return slotId.equals(slot.getString("slotId"));
                    });

                    if (date != null) break;
                }

                continue;
            }

            for (Object dayObj : daySlots) {
                String dayDateStr = extractDayDateStr(dayObj);
                if (date != null) {
                    if (dayDateStr == null || !dayDateStr.equals(date)) {
                        if (dayObj instanceof Map && dayDateStr == null) log.warn("[SchedulerService] deleteSlot: day entry without 'date' keys={}", ((Map<?, ?>) dayObj).keySet());
                        continue;
                    }
                }

                List<?> slots = null;
                if (dayObj instanceof Document) slots = (List<?>) ((Document) dayObj).get("slots");
                else if (dayObj instanceof Map) slots = (List<?>) ((Map<?, ?>) dayObj).get("slots");
                if (slots == null) continue;

                slots.removeIf(slotObj -> {
                    Document slot = new Document((Map<String, Object>) slotObj);
                    return slotId.equals(slot.getString("slotId"));
                });

                if (date != null) break;
            }
        }

        repository.update(scheduler, new ObjectId(schedulerId));
    }

    @SuppressWarnings("unchecked")
    public void deleteResourceSchedule(String schedulerId, String resourceId) {
        Document scheduler = repository.findById(new ObjectId(schedulerId));
        if (scheduler == null) throw new RuntimeException("Scheduler not found");

        List<Document> resourceSchedules = (List<Document>) scheduler.get("resourceSchedules");
        if (resourceSchedules == null) return;

        resourceSchedules.removeIf(resource -> resourceId.equals(resource.getString("resourceId")));

        // if no resources left, delete whole scheduler
        if (resourceSchedules.isEmpty()) {
            repository.delete(new ObjectId(schedulerId));
            return;
        }

        scheduler.put("updatedAt", LocalDateTime.now());
        repository.update(scheduler, new ObjectId(schedulerId));
    }

    @SuppressWarnings("unchecked")
    public void deleteMultipleSlots(List<Map<String, String>> slotsToDelete) {
        List<Document> schedulers = repository.findAll();
        for (Document scheduler : schedulers) {
            String schedulerId = scheduler.getObjectId("_id").toHexString();
            List<Document> resourceSchedules = (List<Document>) scheduler.get("resourceSchedules");
            if (resourceSchedules == null) continue;

            for (Document resource : resourceSchedules) {
                String resourceId = resource.getString("resourceId");
                List<Document> daySlots = (List<Document>) resource.get("daySlots");
                if (daySlots == null) continue;

                for (Document day : daySlots) {
                    List<Document> slots = (List<Document>) day.get("slots");
                    if (slots == null) continue;

                    slots.removeIf(slot -> slotsToDelete.stream().anyMatch(selected ->
                            schedulerId.equals(selected.get("schedulerId"))
                                    && resourceId.equals(selected.get("resourceId"))
                                    && slot.getString("slotId").equals(selected.get("slotId"))));
                }
            }

            repository.update(scheduler, scheduler.getObjectId("_id"));
        }
    }

    /**
     * Extract a normalized YYYY-MM-DD string from a day entry which may store
     * its date under different types (String, java.util.Date) or may omit it.
     */
    private String extractDayDateStr(Object dayObj) {
        Object dayDateObj = null;
        if (dayObj instanceof Document) dayDateObj = ((Document) dayObj).get("date");
        else if (dayObj instanceof Map) dayDateObj = ((Map<?, ?>) dayObj).get("date");

        if (dayDateObj instanceof String) {
            String s = (String) dayDateObj;
            try { return LocalDate.parse(s).toString(); } catch (DateTimeParseException e) { return s; }
        } else if (dayDateObj instanceof Date) {
            Date d = (Date) dayDateObj; return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString();
        }

        if (dayObj instanceof Map) {
            Map<?, ?> m = (Map<?, ?>) dayObj;
            // check keys that may contain a date
            for (Map.Entry<?, ?> e : m.entrySet()) {
                Object key = e.getKey();
                if (key instanceof String) {
                    String k = ((String) key).toLowerCase();
                    if (k.contains("date") || k.contains("day")) {
                        Object v = e.getValue();
                        if (v instanceof String) { try { return LocalDate.parse((String) v).toString(); } catch (DateTimeParseException ex) { return (String) v; } }
                        if (v instanceof Date) { Date d = (Date) v; return d.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString(); }
                    }
                }
            }

            Object display = m.get("displayDay");
            if (display instanceof String) { try { return LocalDate.parse((String) display).toString(); } catch (DateTimeParseException ignored) { /* fallthrough */ } }
            if (display instanceof Map) {
                Map<?, ?> dm = (Map<?, ?>) display;
                Object v = dm.get("date");
                if (v instanceof String) { try { return LocalDate.parse((String) v).toString(); } catch (DateTimeParseException ignored) { return (String) v; } }
                for (Object val : dm.values()) if (val instanceof String) try { return LocalDate.parse((String) val).toString(); } catch (DateTimeParseException ignored) {}
            }
        }

        return null;
    }

}
