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

import com.arnan.auth.repository.AuthRepository;

@Service
public class UserManagementService {

    private static final Logger log = LoggerFactory.getLogger(UserManagementService.class);

    @Autowired
    private AuthRepository authRepository;

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
     * Saves a staff user record (name, phone, specialization, role) to the collection.
     */
    public void addStaffUser(Map<String, Object> body) {
        try {
            Document doc = new Document();
            doc.put("name", body.getOrDefault("name", ""));
            doc.put("phone", body.getOrDefault("phone", ""));
            doc.put("specialization", body.getOrDefault("specialization", ""));
            doc.put("role", body.getOrDefault("role", ""));
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
