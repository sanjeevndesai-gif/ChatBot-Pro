package com.arnan.auth.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import com.arnan.auth.repository.AuthRepository;

@Service
public class UserManagementService {

    private static final Logger log = LoggerFactory.getLogger(UserManagementService.class);

    @Autowired
    private AuthRepository authRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    /**
     * Returns paginated user list in the format the frontend expects:
     * { content: [{ id, payload: { name, phone, role, specialization } }], totalElements, totalPages, page, size }
     */
    public Map<String, Object> getUsersPaginated(int page, int size, String search) {
        try {
            List<Object> allDocs = authRepository.getAll();

            // Map each document to { id, payload: { name, phone, role, specialization } }
            List<Map<String, Object>> mapped = new ArrayList<>();
            for (Object obj : allDocs) {
                Document doc = (Document) obj;

                String id = doc.getObjectId("_id") != null ? doc.getObjectId("_id").toHexString() : "";
                String name = getField(doc, "name", "fullname");
                String phone = getField(doc, "phone", "phone_number");
                String role = doc.getString("role") != null ? doc.getString("role") : "";
                String specialization = doc.getString("specialization") != null ? doc.getString("specialization") : "";
                String email = doc.getString("email") != null ? doc.getString("email") : "";

                // Apply search filter
                if (!search.isEmpty()) {
                    String q = search.toLowerCase();
                    boolean match = name.toLowerCase().contains(q)
                            || phone.toLowerCase().contains(q)
                            || role.toLowerCase().contains(q)
                            || specialization.toLowerCase().contains(q)
                            || email.toLowerCase().contains(q);
                    if (!match) continue;
                }

                // Build a generic payload by copying all non-sensitive fields from the document.
                Map<String, Object> payload = new HashMap<>();
                for (String key : doc.keySet()) {
                    // skip internal id and sensitive fields
                    if ("_id".equals(key) || "password".equalsIgnoreCase(key)) continue;
                    Object val = doc.get(key);
                    // convert BSON Document nested objects to plain Map when needed
                    if (val instanceof Document) {
                        payload.put(key, ((Document) val));
                    } else {
                        payload.put(key, val);
                    }
                }
                // Ensure the normalized name/phone/role keys exist for clients that expect them
                payload.putIfAbsent("name", name);
                payload.putIfAbsent("phone", phone);
                payload.putIfAbsent("role", role);
                payload.putIfAbsent("specialization", specialization);
                payload.putIfAbsent("email", email);

                Map<String, Object> item = new HashMap<>();
                item.put("id", id);
                item.put("payload", payload);
                mapped.add(item);
            }

            // Paginate
            int total = mapped.size();
            int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;
            int fromIndex = Math.min(page * size, total);
            int toIndex = Math.min(fromIndex + size, total);
            List<Map<String, Object>> pageContent = mapped.subList(fromIndex, toIndex);

            Map<String, Object> result = new HashMap<>();
            result.put("content", pageContent);
            result.put("totalElements", total);
            result.put("totalPages", totalPages);
            result.put("page", page);
            result.put("size", size);
            return result;

        } catch (Exception e) {
            log.error("Error fetching paginated users", e);
            throw e;
        }
    }

    /**
     * Returns paginated user list for a specific admin (createdBy) in the format the frontend expects:
     * { content: [{ id, payload: { name, phone, role, specialization } }], totalElements, totalPages, page, size }
     */
    public Map<String, Object> getUsersByAdminPaginated(String adminUserId, int page, int size, String search) {
        try {
            List<Object> allDocs = authRepository.getAllByCreatedBy(adminUserId);

            // Map each document to { id, payload: { name, phone, role, specialization } }
            List<Map<String, Object>> mapped = new ArrayList<>();
            for (Object obj : allDocs) {
                Document doc = (Document) obj;
                String id = doc.getObjectId("_id") != null ? doc.getObjectId("_id").toHexString() : "";
                String name = getField(doc, "name", "fullname");
                String phone = getField(doc, "phone", "phone_number");
                String role = doc.getString("role") != null ? doc.getString("role") : "";
                String specialization = doc.getString("specialization") != null ? doc.getString("specialization") : "";
                String email = doc.getString("email") != null ? doc.getString("email") : "";

                if (!search.isEmpty()) {
                    String q = search.toLowerCase();
                    boolean match = name.toLowerCase().contains(q)
                            || phone.toLowerCase().contains(q)
                            || role.toLowerCase().contains(q)
                            || specialization.toLowerCase().contains(q)
                            || email.toLowerCase().contains(q);
                    if (!match) continue;
                }

                // Build a generic payload by copying all non-sensitive fields from the document.
                Map<String, Object> payload = new HashMap<>();
                for (String key : doc.keySet()) {
                    if ("_id".equals(key) || "password".equalsIgnoreCase(key)) continue;
                    Object val = doc.get(key);
                    if (val instanceof Document) {
                        payload.put(key, ((Document) val));
                    } else {
                        payload.put(key, val);
                    }
                }
                payload.putIfAbsent("name", name);
                payload.putIfAbsent("phone", phone);
                payload.putIfAbsent("role", role);
                payload.putIfAbsent("specialization", specialization);
                payload.putIfAbsent("email", email);

                Map<String, Object> item = new HashMap<>();
                item.put("id", id);
                item.put("payload", payload);
                mapped.add(item);
            }

            int total = mapped.size();
            int totalPages = size > 0 ? (int) Math.ceil((double) total / size) : 1;
            int fromIndex = Math.min(page * size, total);
            int toIndex = Math.min(fromIndex + size, total);
            List<Map<String, Object>> pageContent = mapped.subList(fromIndex, toIndex);

            Map<String, Object> result = new HashMap<>();
            result.put("content", pageContent);
            result.put("totalElements", total);
            result.put("totalPages", totalPages);
            result.put("page", page);
            result.put("size", size);
            return result;

        } catch (Exception e) {
            log.error("Error fetching paginated users by admin", e);
            throw e;
        }
    }

   

    /**
     * Updates a user's own profile fields by MongoDB _id.
     */
   public void updateProfile(String id, Map<String, Object> body) {
    try {
        Document doc = new Document();
        for (Map.Entry<String, Object> entry : body.entrySet()) {
            doc.put(entry.getKey(), entry.getValue());
        }
        // Always update updatedDate
        doc.put("updatedDate", new java.util.Date());
        org.bson.types.ObjectId oid = null;
        // id may be either a MongoDB ObjectId hex (24 chars) or a business userId string.
        if (id != null && id.matches("^[a-fA-F0-9]{24}$")) {
            oid = new org.bson.types.ObjectId(id);
        } else {
            // try finding by userId field
            Document found = authRepository.findByUserId(id);
            if (found == null) {
                throw new RuntimeException("User not found for id=" + id);
            }
            oid = found.getObjectId("_id");
        }

        authRepository.updateById(oid, doc);
        log.info("Profile updated: id={} (oid={})", id, oid != null ? oid.toHexString() : null);
    } catch (Exception e) {
        log.error("Error updating profile id={}", id, e);
        throw e;
    }
}

    /**
     * Changes the user's password after verifying the current password.
     * Throws RuntimeException on bad current password (results in 400 from controller).
     */
    public void changePassword(String id, String currentPassword, String newPassword) {
        try {
            Document user = authRepository.findById(new org.bson.types.ObjectId(id));
            if (user == null) {
                throw new RuntimeException("User not found");
            }
            String stored = user.getString("password");
            if (!passwordEncoder.matches(currentPassword, stored)) {
                throw new RuntimeException("Current password is incorrect");
            }
            Document doc = new Document("password", passwordEncoder.encode(newPassword));
            authRepository.updateById(new org.bson.types.ObjectId(id), doc);
            log.info("Password changed for user id={}", id);
        } catch (Exception e) {
            log.error("Error changing password for id={}", id, e);
            throw e;
        }
    }

    /**
     * Saves a staff user record (name, phone, specialization, role) to the collection.
     */
   
   public void addStaffUser(Map<String, Object> body) {
    try {
        Document doc = new Document();
        for (Map.Entry<String, Object> entry : body.entrySet()) {
            doc.put(entry.getKey(), entry.getValue());
        }
        // Always set createdDate and updatedDate
        doc.put("createdDate", new java.util.Date());
        doc.put("updatedDate", new java.util.Date());
        authRepository.save(doc);
        log.info("Staff user added: {}", body.get("name"));
    } catch (Exception e) {
        log.error("Error adding staff user", e);
        throw e;
    }
}

public void updateStaffUser(String id, Map<String, Object> body) {
    try {
        Document doc = new Document();
        for (Map.Entry<String, Object> entry : body.entrySet()) {
            doc.put(entry.getKey(), entry.getValue());
        }
        // Always update updatedDate
        doc.put("updatedDate", new java.util.Date());
        authRepository.updateById(new org.bson.types.ObjectId(id), doc);
        log.info("Staff user updated: id={}", id);
    } catch (Exception e) {
        log.error("Error updating staff user id={}", id, e);
        throw e;
    }
}

    private String getField(Document doc, String... keys) {
        for (String key : keys) {
            String val = doc.getString(key);
            if (val != null && !val.isEmpty()) return val;
        }
        return "";
    }

    /**
     * Returns doctors whose address or city field contains the given city string (case-insensitive).
     * Used by the chat CLINIC_FINDER_FLOW via GET /auth-service/clinics?city={city}.
     */
    public List<Map<String, Object>> getDoctorsByClinic(String clinicId) {
        try {
            List<Object> allDocs = clinicId == null || clinicId.isBlank()
                    ? authRepository.getAll()
                    : authRepository.getAllByCreatedBy(clinicId);
            List<Map<String, Object>> results = new ArrayList<>();
            for (Object obj : allDocs) {
                Document doc = (Document) obj;
                String role = doc.getString("role") != null ? doc.getString("role").toLowerCase() : "";
                if (!"doctor".equals(role)) continue;
                Map<String, Object> entry = new HashMap<>();
                entry.put("id", doc.getObjectId("_id") != null ? doc.getObjectId("_id").toHexString() : "");
                entry.put("name", getField(doc, "name", "fullname"));
                entry.put("userId", doc.getString("userId") != null ? doc.getString("userId") : "");
                entry.put("phone", getField(doc, "phone", "phone_number"));
                entry.put("specialization", doc.getString("specialization") != null ? doc.getString("specialization") : "");
                entry.put("address", getField(doc, "address", "city", "location"));
                results.add(entry);
            }
            return results;
        } catch (Exception e) {
            log.error("Error fetching doctors by clinicId={}", clinicId, e);
            throw e;
        }
    }

    public List<Map<String, Object>> getClinicsByCity(String city) {
        try {
            List<Object> allDocs = authRepository.getAll();
            String q = city == null ? "" : city.toLowerCase();
            List<Map<String, Object>> results = new ArrayList<>();
            for (Object obj : allDocs) {
                Document doc = (Document) obj;
                String role = doc.getString("role") != null ? doc.getString("role").toLowerCase() : "";
                if (!"doctor".equals(role)) continue;
                String address = getField(doc, "address", "city", "location");
                if (!q.isBlank() && !address.toLowerCase().contains(q)) continue;
                Map<String, Object> entry = new HashMap<>();
                entry.put("id", doc.getObjectId("_id") != null ? doc.getObjectId("_id").toHexString() : "");
                entry.put("name", getField(doc, "name", "fullname"));
                entry.put("userId", doc.getString("userId") != null ? doc.getString("userId") : "");
                entry.put("phone", getField(doc, "phone", "phone_number"));
                entry.put("specialization", doc.getString("specialization") != null ? doc.getString("specialization") : "");
                entry.put("address", address);
                entry.put("city", getField(doc, "city", "address"));
                results.add(entry);
            }
            return results;
        } catch (Exception e) {
            log.error("Error fetching clinics by city={}", city, e);
            throw e;
        }
    }
}

