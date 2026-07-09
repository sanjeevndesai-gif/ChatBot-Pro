package com.arnan.book_appointment.service;


import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.arnan.book_appointment.exception.AppointmentNotFoundException;
import com.arnan.book_appointment.repository.SchedulerRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.format.TextStyle;
import java.time.DayOfWeek;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.UUID;

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

        // Normalize / enhance daySlots before saving
        populateDatesFromDisplayDay(scheduler);
        ensureUniqueSlotIds(scheduler);
        enforceMaxBookingsPerDay(scheduler);

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

        // Normalize / enhance daySlots before updating
        populateDatesFromDisplayDay(scheduler);
        ensureUniqueSlotIds(scheduler);
        enforceMaxBookingsPerDay(scheduler);

        repository.update(scheduler, new ObjectId(id));
        scheduler.put("id", id);
        return scheduler;
    }

    /**
     * Ensure every slot has a unique `slotId` within the scheduler scope.
     * If a slotId is missing or duplicated across different day entries,
     * generate a new UUID for the later occurrences.
     */
    @SuppressWarnings("unchecked")
    private void ensureUniqueSlotIds(Document scheduler) {
        if (scheduler == null) return;
        List<?> resourceSchedules = (List<?>) scheduler.get("resourceSchedules");
        if (resourceSchedules == null) return;

        for (Object rsObj : resourceSchedules) {
            Document rs = (rsObj instanceof Document) ? (Document) rsObj : new Document((Map) rsObj);
            List<?> daySlots = (List<?>) rs.get("daySlots");
            if (daySlots == null) continue;

            // track seen slotIds for this resource
            java.util.Set<String> seen = new java.util.HashSet<>();

            for (Object dayObj : daySlots) {
                List<?> slots = null;
                if (dayObj instanceof Document) slots = (List<?>) ((Document) dayObj).get("slots");
                else if (dayObj instanceof Map) slots = (List<?>) ((Map<?, ?>) dayObj).get("slots");
                if (slots == null) continue;

                for (Object sObj : slots) {
                    Document slot = (sObj instanceof Document) ? (Document) sObj : new Document((Map) sObj);
                    String sid = slot.getString("slotId");
                    if (sid == null || sid.isBlank() || seen.contains(sid)) {
                        String gen = UUID.randomUUID().toString();
                        slot.put("slotId", gen);
                        // propagate back into the original structure when it's a Map
                        if (sObj instanceof Map) ((Map) sObj).put("slotId", gen);
                        if (sObj instanceof Document) ((Document) sObj).put("slotId", gen);
                        seen.add(gen);
                    } else {
                        seen.add(sid);
                    }
                }
            }
        }
    }

    /**
     * If the scheduler includes a `customFromDate` and `customToDate`, and the
     * daySlots contain `displayDay` templates (no `date`), materialize date-specific
     * day entries for dates in the range that match the weekday. This prevents
     * template-only representations and helps delete/update operate on concrete dates.
     */
    @SuppressWarnings("unchecked")
    private void populateDatesFromDisplayDay(Document scheduler) {
        if (scheduler == null) return;
        String from = null;
        String to = null;
        if (scheduler.containsKey("customFromDate")) from = (String) scheduler.get("customFromDate");
        if (scheduler.containsKey("customToDate")) to = (String) scheduler.get("customToDate");
        if (from == null || to == null) return;

        LocalDate start;
        LocalDate end;
        try {
            start = LocalDate.parse(from);
            end = LocalDate.parse(to);
        } catch (Exception e) {
            return;
        }

        List<?> resourceSchedules = (List<?>) scheduler.get("resourceSchedules");
        if (resourceSchedules == null) return;

        // iterate dates in range
        final LocalDate today = LocalDate.now();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            // Skip past dates — do not materialize daySlots before today
            if (d.isBefore(today)) continue;
            String dayName = d.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
            String dateStr = d.toString();

            for (Object rsObj : resourceSchedules) {
                Document rs = null;
                try {
                    rs = (rsObj instanceof Document) ? (Document) rsObj : new Document((Map) rsObj);
                } catch (ClassCastException cce) {
                    rs = new Document();
                }

                List<?> daySlotsRaw = (List<?>) rs.get("daySlots");
                if (daySlotsRaw == null) continue;

                // Check if date already materialized
                boolean already = false;
                for (Object dsObj : daySlotsRaw) {
                    Document ds = (dsObj instanceof Document) ? (Document) dsObj : new Document((Map) dsObj);
                    Object dd = ds.get("date");
                    if (dd != null && dateStr.equals(dd.toString())) { already = true; break; }
                }
                if (already) continue;

                // find template with matching displayDay (template may be Document or Map)
                Document template = null;
                for (Object dsObj : daySlotsRaw) {
                    Document ds = (dsObj instanceof Document) ? (Document) dsObj : new Document((Map) dsObj);
                    Object disp = ds.get("displayDay");
                    if (disp != null && dayName.equalsIgnoreCase(disp.toString())) { template = ds; break; }
                }
                if (template == null) continue;

                // create copy with concrete date
                Document newDay = new Document();
                newDay.put("date", dateStr);
                newDay.put("displayDay", dayName);
                newDay.put("unavailable", template.getOrDefault("unavailable", false));
                List<?> tplSlots = (List<?>) template.get("slots");
                if (tplSlots != null) {
                    List<Document> copied = new java.util.ArrayList<>();
                    for (Object s : tplSlots) copied.add(new Document((Map) s));
                    newDay.put("slots", copied);
                } else {
                    newDay.put("slots", new java.util.ArrayList<>());
                }

                // append to underlying list
                if (daySlotsRaw instanceof List) ((List) daySlotsRaw).add(newDay);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void enforceMaxBookingsPerDay(Document scheduler) {
        if (scheduler == null) return;
        Integer max = null;
        if (scheduler.containsKey("maxBookingsPerDay")) {
            try { max = (Integer) scheduler.get("maxBookingsPerDay"); } catch (Exception e) { /* ignore */ }
        }
        if (max == null || max <= 0) return;

        List<?> resourceSchedules = (List<?>) scheduler.get("resourceSchedules");
        if (resourceSchedules == null) return;

        for (Object rsObj : resourceSchedules) {
            Document rs = (rsObj instanceof Document) ? (Document) rsObj : new Document((Map) rsObj);
            List<?> daySlots = (List<?>) rs.get("daySlots");
            if (daySlots == null) continue;

            for (Object dayObj : daySlots) {
                List<?> slots = null;
                if (dayObj instanceof Document) slots = (List<?>) ((Document) dayObj).get("slots");
                else if (dayObj instanceof Map) slots = (List<?>) ((Map<?, ?>) dayObj).get("slots");
                if (slots == null) continue;

                if (slots.size() > max) {
                    // Trim to the first `max` entries
                    List<Object> trimmed = new java.util.ArrayList<>();
                    for (int i = 0; i < max; i++) trimmed.add(slots.get(i));
                    if (dayObj instanceof Document) ((Document) dayObj).put("slots", trimmed);
                    else if (dayObj instanceof Map) ((Map) dayObj).put("slots", trimmed);
                }
            }
        }
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

        // Find the target resourceSchedule once
        Document targetResource = null;
        for (Object rsObj : resourceSchedules) {
            Document rs = (rsObj instanceof Document) ? (Document) rsObj : new Document((Map) rsObj);
            if (resourceId.equals(rs.getString("resourceId"))) { targetResource = rs; break; }
        }
        if (targetResource == null) return;

        boolean removedAny = false;

        List<?> daySlots = (List<?>) targetResource.get("daySlots");

        // First try resource-level daySlots
        if (daySlots != null) {
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

                int before = slots.size();
                slots.removeIf(slotObj -> {
                    Document slot = (slotObj instanceof Document) ? (Document) slotObj : new Document((Map) slotObj);
                    return slotId.equals(slot.getString("slotId"));
                });
                if (slots.size() < before) removedAny = true;

                if (date != null && removedAny) break;
            }
        }

        // If not removed and scheduler-level daySlots exist, try them
        if (!removedAny) {
            List<?> schedDaySlots = (List<?>) scheduler.get("daySlots");
            if (schedDaySlots != null) {
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

                    int before = slots.size();
                    slots.removeIf(slotObj -> {
                        Document slot = (slotObj instanceof Document) ? (Document) slotObj : new Document((Map) slotObj);
                        return slotId.equals(slot.getString("slotId"));
                    });
                    if (slots.size() < before) removedAny = true;

                    if (date != null && removedAny) break;
                }
            }
        }

        // If nothing removed but a date was requested and day templates exist (displayDay),
        // materialize a date-specific day entry copied from the template and remove the slot from it.
        if (!removedAny && date != null) {
            LocalDate ld;
            try { ld = LocalDate.parse(date); }
            catch (Exception ex) { ld = null; }

            if (ld != null) {
                String dayName = ld.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH); // e.g., "Sunday"

                // try resource template first
                if (daySlots != null) {
                    Document template = null;
                    for (Object dayObj : daySlots) {
                        if (dayObj instanceof Document) {
                            Document d = (Document) dayObj;
                            Object dd = d.get("displayDay");
                            if (dd != null && dayName.equalsIgnoreCase(dd.toString())) { template = d; break; }
                        } else if (dayObj instanceof Map) {
                            Map<?, ?> m = (Map<?, ?>) dayObj;
                            Object dd = m.get("displayDay");
                            if (dd != null && dayName.equalsIgnoreCase(dd.toString())) { template = new Document((Map) m); break; }
                        }
                    }

                    if (template != null) {
                        // create date-specific copy
                        Document newDay = new Document();
                        newDay.put("date", date);
                        newDay.put("displayDay", dayName);
                        newDay.put("unavailable", template.getOrDefault("unavailable", false));
                        List<?> tplSlots = (List<?>) template.get("slots");
                        if (tplSlots != null) {
                            // shallow copy of slots
                            List<Document> copied = new java.util.ArrayList<>();
                                for (Object s : tplSlots) copied.add(new Document((Map) s));
                            // remove the targeted slot
                            copied.removeIf(s -> slotId.equals(((Document) s).getString("slotId")));
                            newDay.put("slots", copied);
                        }

                        // append to resource-level daySlots (create if missing)
                        if (daySlots instanceof List) {
                            ((List) daySlots).add(newDay);
                            removedAny = true;
                        }
                    }
                }

                // fallback: try scheduler-level templates
                if (!removedAny) {
                    List<?> schedTemplates = (List<?>) scheduler.get("daySlots");
                    if (schedTemplates != null) {
                        Document template = null;
                        for (Object dayObj : schedTemplates) {
                            if (dayObj instanceof Document) {
                                Document d = (Document) dayObj;
                                Object dd = d.get("displayDay");
                                if (dd != null && dayName.equalsIgnoreCase(dd.toString())) { template = d; break; }
                            } else if (dayObj instanceof Map) {
                                Map<?, ?> m = (Map<?, ?>) dayObj;
                                Object dd = m.get("displayDay");
                                if (dd != null && dayName.equalsIgnoreCase(dd.toString())) { template = new Document((Map) m); break; }
                            }
                        }

                        if (template != null) {
                            Document newDay = new Document();
                            newDay.put("date", date);
                            newDay.put("displayDay", dayName);
                            newDay.put("unavailable", template.getOrDefault("unavailable", false));
                            List<?> tplSlots = (List<?>) template.get("slots");
                            if (tplSlots != null) {
                                List<Document> copied = new java.util.ArrayList<>();
                                for (Object s : tplSlots) copied.add(new Document((Map) s));
                                copied.removeIf(s -> slotId.equals(((Document) s).getString("slotId")));
                                newDay.put("slots", copied);
                            }

                            // ensure resource has daySlots list
                            if (targetResource.get("daySlots") == null) targetResource.put("daySlots", new java.util.ArrayList<>());
                            ((List) targetResource.get("daySlots")).add(newDay);
                            removedAny = true;
                        }
                    }
                }
            }
        }

        if (removedAny) {
            scheduler.put("updatedAt", LocalDateTime.now());
            repository.update(scheduler, new ObjectId(schedulerId));
        }
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
