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

                Map<String, Object> payload = new HashMap<>();
                payload.put("name", name);
                payload.put("phone", phone);
                payload.put("role", role);
                payload.put("specialization", specialization);
                payload.put("email", email);

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
     * Updates a staff user record by MongoDB _id.
     */
    public void updateStaffUser(String id, Map<String, Object> body) {
        try {
            Document doc = new Document();
            if (body.containsKey("name")) doc.put("name", body.get("name"));
            if (body.containsKey("phone")) doc.put("phone", body.get("phone"));
            if (body.containsKey("specialization")) doc.put("specialization", body.get("specialization"));
            if (body.containsKey("role")) doc.put("role", body.get("role"));
            if (body.containsKey("about")) doc.put("about", body.get("about"));
            if (body.containsKey("photo")) doc.put("photo", body.get("photo"));
            authRepository.updateById(new org.bson.types.ObjectId(id), doc);
            log.info("Staff user updated: id={}", id);
        } catch (Exception e) {
            log.error("Error updating staff user id={}", id, e);
            throw e;
        }
    }

    /**
     * Updates a user's own profile fields by MongoDB _id.
     */
    public void updateProfile(String id, Map<String, Object> body) {
        try {
            Document doc = new Document();
            if (body.containsKey("fullname")) doc.put("fullname", body.get("fullname"));
            if (body.containsKey("email")) doc.put("email", body.get("email"));
            if (body.containsKey("phone")) doc.put("phone", body.get("phone"));
            if (body.containsKey("address")) doc.put("address", body.get("address"));
            if (body.containsKey("country")) doc.put("country", body.get("country"));
            if (body.containsKey("language")) doc.put("language", body.get("language"));
            authRepository.updateById(new org.bson.types.ObjectId(id), doc);
            log.info("Profile updated: id={}", id);
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
            doc.put("name", body.getOrDefault("name", ""));
            doc.put("phone", body.getOrDefault("phone", ""));
            doc.put("specialization", body.getOrDefault("specialization", ""));
            doc.put("role", body.getOrDefault("role", ""));
            doc.put("about", body.getOrDefault("about", ""));
            doc.put("photo", body.getOrDefault("photo", ""));
            authRepository.save(doc);
            log.info("Staff user added: {}", body.get("name"));
        } catch (Exception e) {
            log.error("Error adding staff user", e);
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
}
