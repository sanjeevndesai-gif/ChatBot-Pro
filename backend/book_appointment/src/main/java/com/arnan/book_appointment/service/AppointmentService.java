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

        Document existing = repository.findByAppointmentNumber(id);
        ObjectId targetObjectId = null;
        if (existing != null) {
            ObjectId found = existing.getObjectId("_id");
            if (found != null) targetObjectId = found;
        }

        if (existing == null) {
            log.warn("Appointment not found for update: id={}", id);
            throw new AppointmentNotFoundException("Appointment not found with id: " + id);
        }

        // Preserve immutable fields when updating
        if (existing.containsKey("appointmentNumber")) {
            updated.put("appointmentNumber", existing.getString("appointmentNumber"));
        }
        if (existing.containsKey("createdAt")) {
            updated.put("createdAt", existing.get("createdAt"));
        }

        // Interpret reportStatus: set COMPLETED when reported, INACTIVE when not reported
        try {
            Object rs = updated.get("reportStatus");
            if (rs != null) {
                String rsStr = String.valueOf(rs).trim().toLowerCase();
                if (rsStr.equals("reported") || rsStr.equals("true") || rsStr.equals("1") || rsStr.equals("yes")) {
                    updated.put("status", "COMPLETED");
                    updated.put("reportedAt", LocalDateTime.now());
                } else if (rsStr.equals("not reported") || rsStr.equals("false") || rsStr.equals("0") || rsStr.equals("no")) {
                    updated.put("status", "INACTIVE");
                }
            }
        } catch (Exception e) {
            log.warn("Could not interpret reportStatus: {}", e.getMessage());
        }

        updated.put("updatedAt", LocalDateTime.now());

        // Ensure we have a target ObjectId to update
        if (targetObjectId == null) {
            ObjectId maybe = existing.getObjectId("_id");
            if (maybe != null) targetObjectId = maybe;
        }

        if (targetObjectId == null) {
            log.warn("Could not resolve target ObjectId for update id={}", id);
            throw new AppointmentNotFoundException("Could not resolve target id for update: " + id);
        }

        repository.update(updated, targetObjectId);

        updated.put("id", targetObjectId.toHexString());

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

    /**
     * Return appointments for a user's clinic. Tries to resolve the user's org information
     * by calling the auth-service. If that fails, falls back to appointments booked by the user.
     */
    public List<Document> getByClinicForUser(String userId) {
        try {
            if (userId == null || userId.isBlank()) {
                return getAll();
            }

            // Treat the provided id as a clinic/org id first (appointments saved with orgId)
            List<Document> byOrg = repository.findByOrgId(userId);
            if (byOrg != null && !byOrg.isEmpty()) return byOrg;

            // Then prefer appointments explicitly created by this scheduler/user (e.g. schedules)
            List<Document> created = repository.findByCreatedBy(userId);
            if (created != null && !created.isEmpty()) return created;

            // Fallback: return appointments where the booking user matches
            return repository.findByBookingUser(userId);
        } catch (Exception e) {
            log.error("Error fetching clinic appointments for userId={}", userId, e);
            return List.of();
        }
    }

    /**
     * Return clinic appointments when the frontend forwards the current user's id.
     * Note: we no longer call the auth-service from this service; frontend must
     * provide `X-User-Id` to allow server-side filtering.
     */
    public List<Document> getByClinicForToken(String authHeader, String forwardedUserId) {
        try {
            log.info("getByClinicForToken invoked - forwardedUserId={}", forwardedUserId);
            // If frontend forwarded the current user id, use it directly (no auth-service call)
            if (forwardedUserId != null && !forwardedUserId.isBlank()) {
                log.info("Resolving clinic appointments for forwardedUserId={}", forwardedUserId);
                List<Document> byOrg = repository.findByOrgId(forwardedUserId);
                if (byOrg != null && !byOrg.isEmpty()) return byOrg;

                List<Document> created = repository.findByCreatedBy(forwardedUserId);
                if (created != null && !created.isEmpty()) {
                    log.info("Found {} appointments createdBy {} - returning created list", created.size(), forwardedUserId);
                    return created;
                }

                return repository.findByBookingUser(forwardedUserId);
            }

            // Do not attempt to call auth-service here. Require frontend to forward user id.
            return List.of();
        } catch (Exception e) {
            log.error("Error resolving clinic by token", e);
            return List.of();
        }
    }

    /**
     * Create an appointment but first try to infer `orgId` / `createdBy` from
     * a forwarded header, the appointment payload, or a bearer JWT payload.
     */
    public Document createWithInference(Document appointment, String forwardedUserId, String authHeader) {
        // If the frontend forwarded a user/clinic id, persist it so reports can filter by orgId/createdBy
        if (forwardedUserId != null && !forwardedUserId.isBlank()) {
            if (!appointment.containsKey("orgId")) appointment.put("orgId", forwardedUserId);
            if (!appointment.containsKey("createdBy")) appointment.put("createdBy", forwardedUserId);
        } else {
            // Try to infer a clinic/user id from the appointment payload for web clients
            String[] candidateKeys = new String[]{"orgId", "userId", "createdBy", "bookingUser", "booking_by", "booked_by"};
            String inferred = null;
            for (String k : candidateKeys) {
                if (appointment.containsKey(k)) {
                    Object v = appointment.get(k);
                    if (v == null) continue;
                    if (v instanceof org.bson.Document) {
                        org.bson.Document dv = (org.bson.Document) v;
                        Object mv = dv.get("userId");
                        if (mv == null) mv = dv.get("_id");
                        if (mv != null) inferred = String.valueOf(mv);
                    } else {
                        inferred = String.valueOf(v);
                    }
                }
                if (inferred != null && !inferred.isBlank()) break;
            }
            if (inferred != null && !inferred.isBlank()) {
                if (!appointment.containsKey("orgId")) appointment.put("orgId", inferred);
                if (!appointment.containsKey("createdBy")) appointment.put("createdBy", inferred);
            }
        }

        // If still missing, try to decode a bearer JWT (without validating signature)
        if ((!appointment.containsKey("orgId") || !appointment.containsKey("createdBy")) && authHeader != null && authHeader.toLowerCase().startsWith("bearer ")) {
            try {
                String token = authHeader.substring(7).trim();
                String[] parts = token.split("\\.");
                if (parts.length >= 2) {
                    String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
                    org.bson.Document claims = org.bson.Document.parse(payload);
                    Object uid = claims.get("orgId");
                    if (uid == null) uid = claims.get("userId");
                    if (uid == null) uid = claims.get("sub");
                    if (uid == null) uid = claims.get("id");
                    if (uid != null) {
                        String inferredFromToken = String.valueOf(uid);
                        if (!appointment.containsKey("orgId")) appointment.put("orgId", inferredFromToken);
                        if (!appointment.containsKey("createdBy")) appointment.put("createdBy", inferredFromToken);
                    }
                }
            } catch (Exception e) {
                log.warn("Could not decode JWT to infer user id: {}", e.getMessage());
            }
        }

        return create(appointment);
    }

    // ================= GET BY PATIENT PHONE =================
    public List<Document> getByPatientPhone(String phone, String clinicId) {
        log.info("Fetching appointments for phone={} clinicId={}", phone, clinicId);
        return repository.findByPatientPhone(phone, clinicId);
    }

    // ================= GET UPCOMING FOR PATIENT =================
    /**
     * Returns the next BOOKED appointment for a patient at a clinic.
     * Returns null if none found.
     */
    public Document getUpcoming(String phone, String clinicId) {
        log.info("Fetching upcoming appointment for phone={} clinicId={}", phone, clinicId);
        List<Document> all = repository.findByPatientPhone(phone, clinicId);
        // Return the first BOOKED appointment (already sorted by date in the query, or take first)
        return all.stream()
                .filter(d -> "BOOKED".equalsIgnoreCase(String.valueOf(d.getOrDefault("status", ""))))
                .findFirst()
                .orElse(null);
    }

    // ================= CANCEL BY APPOINTMENT NUMBER =================
    /**
     * Cancels an appointment identified by its human-readable appointmentNumber.
     * Used by the APPOINTMENT_FLOW cancel branch via chat.
     */
    public void cancelByRef(String appointmentNumber) {
        log.info("Canceling appointment by ref={}", appointmentNumber);
        Document existing = repository.findByAppointmentNumber(appointmentNumber);
        if (existing == null) {
            log.warn("Appointment not found for ref={}", appointmentNumber);
            throw new AppointmentNotFoundException("Appointment not found: " + appointmentNumber);
        }
        org.bson.types.ObjectId id = existing.getObjectId("_id");
        if (id == null) throw new AppointmentNotFoundException("Cannot resolve id for ref: " + appointmentNumber);
        repository.delete(id);
        log.info("Appointment cancelled by ref={}", appointmentNumber);
    }
}