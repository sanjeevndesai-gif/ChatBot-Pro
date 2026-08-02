package com.arnan.auth.service;

import java.time.ZoneOffset;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.stereotype.Service;

import com.arnan.auth.repository.AuthRepository;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    private final AuthRepository authRepository;

    // Constructor injection (replaces field @Autowired)
    public AdminService(AuthRepository authRepository) {
        this.authRepository = authRepository;
    }

    /**
     * List pending users (status == "pending"). Simple pagination in-memory for now.
     */
    public List<Document> listPendingApprovals(int page, int size) {
        // Delegate DB paging query to repository
        return authRepository.findPendingApprovals(page, size);
    }

    public long countPendingApprovals() {
        return authRepository.countPendingApprovals();
    }

    /**
     * Approve a pending user: create clinic doc, update user.status -> active and set clinicId
     */
    public Document approveUser(String userId, Map<String, Object> clinicPayload, String adminUserId) {
        try {
            Document user = authRepository.findByUserId(userId);
            if (user == null) throw new RuntimeException("User not found: " + userId);

            // create clinic document in `clinics` collection (repository handles DB)
            Document clinic = new Document();
            clinic.put("name", clinicPayload != null && clinicPayload.get("name") != null ? clinicPayload.get("name") : user.getString("orgname"));
            clinic.put("ownerUserId", userId);
            clinic.put("createdDate", new Date());
            clinic.put("status", "active");

            ObjectId clinicOid = authRepository.insertClinic(clinic);

            // update user: status active, clinicId
            ObjectId userOid = user.getObjectId("_id");
            Document update = new Document();
            update.put("status", "active");
            update.put("clinicId", clinicOid != null ? clinicOid.toHexString() : null);
            update.put("updatedDate", new Date());
            authRepository.updateById(userOid, update);

            // write approvals audit entry (repository handles audit collection)
            Document audit = new Document();
            audit.put("userId", userId);
            audit.put("adminId", adminUserId);
            audit.put("action", "approve");
            audit.put("note", clinicPayload != null ? clinicPayload.getOrDefault("note", "") : "approved via admin API");
            audit.put("timestamp", new Date());
            authRepository.insertApprovalAudit(audit);

            Document updatedUser = authRepository.findByUserId(userId);
            return updatedUser;
        } catch (Exception e) {
            log.error("Error approving user {}", userId, e);
            throw e;
        }
    }

    public void rejectUser(String userId, String reason, String adminUserId) {
        try {
            Document user = authRepository.findByUserId(userId);
            if (user == null) throw new RuntimeException("User not found: " + userId);
            ObjectId userOid = user.getObjectId("_id");
            Document update = new Document();
            update.put("status", "rejected");
            update.put("updatedDate", new Date());
            authRepository.updateById(userOid, update);

            Document audit = new Document();
            audit.put("userId", userId);
            audit.put("adminId", adminUserId);
            audit.put("action", "reject");
            audit.put("note", reason != null ? reason : "rejected by admin");
            audit.put("timestamp", new Date());
            authRepository.insertApprovalAudit(audit);

        } catch (Exception e) {
            log.error("Error rejecting user {}", userId, e);
            throw e;
        }
    }

    /**
     * Generic action recorder for front-end actions that don't map to approve/reject.
     */
    public void recordAction(String targetId, String action, Map<String, Object> payload, String adminUserId) {
        try {
            Document audit = new Document();
            audit.put("targetId", targetId);
            audit.put("adminId", adminUserId);
            audit.put("action", action);
            audit.put("payload", payload != null ? new Document(payload) : new Document());
            audit.put("timestamp", new Date());
            authRepository.insertApprovalAudit(audit);
        } catch (Exception e) {
            log.error("Error recording action {} for target {}", action, targetId, e);
            throw e;
        }
    }

    /**
     * Simple overview metrics aggregated from users and clinics collections.
     */
        public Map<String, Object> getOverview() {
        try {
            // compute UTC start of day
            Date startOfDay = Date.from(
                LocalDate.now(ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant()
            );

            // Build a native aggregation pipeline (single DB query) using Documents.
            // 1) $match: exclude explicit admin users (role == 'admin' OR roles array contains 'admin')
            // 2) $group: compute sums using $cond and $ifNull
            List<Document> pipeline = new ArrayList<>();

            Document match = new Document("$match",
                new Document("$and", Arrays.asList(
                    new Document("role", new Document("$ne", "admin")),
                    new Document("roles", new Document("$ne", "admin"))
                ))
            );

            Document groupFields = new Document();
            groupFields.put("_id", null);

            // Helper conditions to exclude admin users
            Document notRoleAdmin = new Document("$ne", Arrays.asList(new Document("$ifNull", Arrays.asList("$role", null)), "admin"));
            // $not aggregation expression expects an array: $not: [ { $in: ["admin", <rolesArray>] } ]
            // Use $ifNull to ensure missing `roles` becomes an empty array so $in always receives an array.
            Document rolesArrayExpr = new Document("$ifNull", Arrays.asList("$roles", new ArrayList<>()));
            Document notInRolesAdmin = new Document("$not", Arrays.asList(
                new Document("$in", Arrays.asList("admin", rolesArrayExpr))
            ));

            // totalUsers: sum { $cond: [ { $and: [status == 'active', not admin] }, 1, 0 ] }
            groupFields.put("totalUsers", new Document("$sum",
                new Document("$cond", Arrays.asList(
                    new Document("$and", Arrays.asList(
                        new Document("$eq", Arrays.asList("$status", "active")),
                        notRoleAdmin,
                        notInRolesAdmin
                    )), 1, 0
                ))
            ));

            // pendingApprovals: status == 'pending' and not admin
            groupFields.put("pendingApprovals", new Document("$sum",
                new Document("$cond", Arrays.asList(
                    new Document("$and", Arrays.asList(
                        new Document("$eq", Arrays.asList("$status", "pending")),
                        notRoleAdmin,
                        notInRolesAdmin
                    )), 1, 0
                ))
            ));

            // subscribedUsers: billing.status == active and not admin
            groupFields.put("subscribedUsers", new Document("$sum",
                new Document("$cond", Arrays.asList(
                    new Document("$and", Arrays.asList(
                        new Document("$eq", Arrays.asList("$billing.status", "active")),
                        notRoleAdmin,
                        notInRolesAdmin
                    )), 1, 0
                ))
            ));

            // todaysSignups: createdDate >= startOfDay and not admin
            groupFields.put("todaysSignups", new Document("$sum",
                new Document("$cond", Arrays.asList(
                    new Document("$and", Arrays.asList(
                        new Document("$gte", Arrays.asList("$createdDate", startOfDay)),
                        notRoleAdmin,
                        notInRolesAdmin
                    )), 1, 0
                ))
            ));

            // revenue: sum of billing.planPrice (use $ifNull) but exclude admin users
            groupFields.put("revenue", new Document("$sum",
                new Document("$cond", Arrays.asList(
                    new Document("$and", Arrays.asList(
                        notRoleAdmin,
                        notInRolesAdmin
                    )), new Document("$ifNull", Arrays.asList("$billing.planPrice", 0)), 0
                ))
            ));

            Document group = new Document("$group", groupFields);

            pipeline.add(match);
            pipeline.add(group);

            // Execute aggregation on the `auth` collection via repository (single DB query)
            Document stats = authRepository.aggregateOverview(pipeline);

            long totalClinics = authRepository.countClinics();

            Map<String, Object> out = new HashMap<>();
            out.put("totalClinics", totalClinics);
            out.put("totalUsers", stats != null && stats.get("totalUsers") != null ? stats.get("totalUsers") : 0);
            out.put("pendingApprovals", stats != null && stats.get("pendingApprovals") != null ? stats.get("pendingApprovals") : 0);
            out.put("todaysSignups", stats != null && stats.get("todaysSignups") != null ? stats.get("todaysSignups") : 0);
            out.put("subscribedUsers", stats != null && stats.get("subscribedUsers") != null ? stats.get("subscribedUsers") : 0);
            out.put("revenue", stats != null && stats.get("revenue") != null ? stats.get("revenue") : 0);
            out.put("generatedAt", new Date().toString());

            return out;
        } catch (Exception e) {
            log.error("Error building overview metrics", e);
            throw e;
        }
        }

    // remove insertAudit helper; repository now manages audit insertion
}
