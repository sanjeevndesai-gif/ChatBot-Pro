package com.arnan.auth.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.HashMap;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.arnan.auth.repository.AuthRepository;
import com.arnan.auth.service.PlanService;

@Service
public class BillingService {

    private static final Logger log = LoggerFactory.getLogger(BillingService.class);
    private static final int DAYS_TOTAL = 30;

    /**
     * Doctor limits per plan — single source of truth from the backend.
     * -1 means unlimited.
     */
    private static final Map<String, Integer> PLAN_DOCTOR_LIMITS = new HashMap<>();
    static {
        PLAN_DOCTOR_LIMITS.put("Basic",      1);
        PLAN_DOCTOR_LIMITS.put("Lite",       5);
        PLAN_DOCTOR_LIMITS.put("Plus",      20);
        PLAN_DOCTOR_LIMITS.put("Enterprise", -1);  // unlimited
    }

    @Autowired
    private AuthRepository authRepository;
    
    @Autowired
    private PlanService planService;

    // --- Helpers -------------------------------------------------
    private ObjectId parseObjectId(String mongoId) {
        if (mongoId == null) return null;
        String s = mongoId.trim();
        // If passed as JSON like {"$oid":"..."}, extract
        if (s.contains("$oid")) {
            int i = s.indexOf("$oid");
            int start = s.indexOf('"', i);
            if (start >= 0) {
                int next = s.indexOf('"', start + 1);
                if (next > start) {
                    String inner = s.substring(start + 1, next);
                    s = inner;
                }
            }
        }
        // Only accept 24-hex characters
        if (s.matches("^[0-9a-fA-F]{24}$")) {
            try {
                return new ObjectId(s);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Returns the billing/plan info for a user.
     * Computes daysUsed dynamically from planStartDate stored in DB.
     * Defaults to Basic plan if no billing info exists.
     * Auto-marks deactivated when daysUsed >= daysTotal.
     */
    public Map<String, Object> getBilling(String mongoId) {
        try {
            ObjectId oid = parseObjectId(mongoId);
            Document user = null;
            if (oid != null) {
                user = authRepository.findById(oid);
            } else {
                // caller passed a userId or email string
                user = authRepository.findByUserId(mongoId);
                if (user == null) user = authRepository.findByEmail(mongoId);
            }

            if (user == null) {
                log.warn("No user found for identifier '{}', returning default billing", mongoId);
                return buildDefaultBilling();
            }

            Document billing = (Document) user.get("billing");
            if (billing == null) {
                return buildDefaultBilling();
            }

            // Compute daysUsed dynamically
            long planStartMs = billing.getLong("planStartMs") != null
                    ? billing.getLong("planStartMs")
                    : Instant.now().toEpochMilli();

            Instant planStart = Instant.ofEpochMilli(planStartMs);
            long daysUsed = ChronoUnit.DAYS.between(planStart, Instant.now());
            daysUsed = Math.min(daysUsed, DAYS_TOTAL);
            daysUsed = Math.max(daysUsed, 0);

            String status = billing.getString("status") != null ? billing.getString("status") : "active";

            // Auto-deactivate when days are exhausted
            if (daysUsed >= DAYS_TOTAL && !"deactivated".equals(status)) {
                status = "deactivated";
                authRepository.updateBillingField(oid, "billing.status", "deactivated");
                log.info("User {} auto-deactivated: usage 100%", mongoId);
            }

            // Resolve live plan template from plans collection when possible
            String planCode = billing.getString("planCode");
            Document planTemplate = null;
            if (planCode != null) {
                planTemplate = planService.getPlanByPlanCode(planCode);
            }

            Map<String, Object> result = new HashMap<>();
            String resolvedName = billing.getString("planName");
            if (planTemplate != null) {
                resolvedName = planTemplate.getString("name");
            }
            result.put("planName", resolvedName != null ? resolvedName : "Basic");
            int resolvedPrice = billing.getInteger("planPrice") != null ? billing.getInteger("planPrice") : 0;
            if (planTemplate != null) {
                try {
                    resolvedPrice = ((List<Document>)planTemplate.get("pricing")).get(0).getInteger("price");
                } catch (Exception e) {
                    // ignore, keep billing planPrice
                }
            }
            result.put("planPrice", resolvedPrice);
            result.put("currency", planTemplate != null ? planTemplate.getString("currency") : "$" );
            result.put("activeUntil", billing.getLong("activeUntilMs") != null ? billing.getLong("activeUntilMs") : Instant.now().plus(DAYS_TOTAL, ChronoUnit.DAYS).toEpochMilli());
            result.put("daysUsed", (int) daysUsed);
            result.put("daysTotal", DAYS_TOTAL);
            result.put("status", status);
            // Warning flag: 80% threshold
            result.put("nearExpiry", daysUsed >= (long)(DAYS_TOTAL * 0.8) && daysUsed < DAYS_TOTAL);

            // Convenience fields for frontend
            int daysRemaining = (int) (DAYS_TOTAL - daysUsed);
            daysRemaining = Math.max(daysRemaining, 0);
            result.put("daysRemaining", daysRemaining);
            int progressPercent = (int) ((daysUsed * 100) / DAYS_TOTAL);
            progressPercent = Math.min(Math.max(progressPercent, 0), 100);
            result.put("progressPercent", progressPercent);

            String planNameForLimit = billing.getString("planName") != null ? billing.getString("planName") : "Basic";
            // Determine maxDoctors from live plan template when available
            int maxDoctors = PLAN_DOCTOR_LIMITS.getOrDefault(planNameForLimit, 1);
            if (planTemplate != null) {
                try {
                    Document limits = (Document) planTemplate.get("limits");
                    if (limits != null && limits.getInteger("maxDoctors") != null) {
                        maxDoctors = limits.getInteger("maxDoctors");
                    }
                } catch (Exception e) {
                    // ignore
                }
            }
            result.put("maxDoctors", maxDoctors);

            // Include live plan template for frontend to render features/pricing
            if (planTemplate != null) result.put("planTemplate", planTemplate);

            return result;
        } catch (Exception e) {
            log.error("Error fetching billing for user {}", mongoId, e);
            return buildDefaultBilling();
        }
    }

    /**
     * Upgrades the plan for a user. Resets the billing period to 30 days from now.
     */
    public void upgradePlan(String mongoId, String planName, int planPrice) {
        try {
            Instant now = Instant.now();
            Instant activeUntil = now.plus(DAYS_TOTAL, ChronoUnit.DAYS);

            Document billing = new Document();
            String planCode = mapNameToCode(planName);
            billing.put("planCode", planCode);
            billing.put("planName", planName);
            billing.put("planPrice", planPrice);
            billing.put("planStartMs", now.toEpochMilli());
            billing.put("activeUntilMs", activeUntil.toEpochMilli());
            billing.put("status", "active");
            // Resolve whether caller provided an ObjectId hex or a userId/email string
            ObjectId oid = parseObjectId(mongoId);
            if (oid == null) {
                Document user = authRepository.findByUserId(mongoId);
                if (user == null) user = authRepository.findByEmail(mongoId);
                if (user == null) {
                    log.warn("Could not find user by id/email '{}', aborting upgrade", mongoId);
                    return;
                }
                oid = user.getObjectId("_id");
            }

            authRepository.updateBillingDocument(oid, billing);
            log.info("Plan upgraded for user {}: {} @ ${}", oid.toHexString(), planName, planPrice);
        } catch (Exception e) {
            log.error("Error upgrading plan for user {}", mongoId, e);
            throw e;
        }
    }

    /**
     * Upgrade using a planCode and billingCycle (e.g., monthly, yearly).
     * If price is null, resolve from the plan template pricing for the given cycle.
     */
    public void upgradePlanByCode(String mongoId, String planCode, String billingCycle, Integer price) {
        try {
            if (planCode == null) planCode = "BASIC";
            Document planTemplate = planService.getPlanByPlanCode(planCode);

            // Determine planName and price
            String planName = planTemplate != null ? planTemplate.getString("name") : planCode;
            Integer resolvedPrice = price;
            if (resolvedPrice == null && planTemplate != null) {
                try {
                    List<Document> pricing = (List<Document>) planTemplate.get("pricing");
                    if (pricing != null) {
                        for (Document p : pricing) {
                            if (billingCycle != null && billingCycle.equals(p.getString("billingCycle"))) {
                                resolvedPrice = p.getInteger("price");
                                break;
                            }
                        }
                        if (resolvedPrice == null && !pricing.isEmpty()) {
                            resolvedPrice = pricing.get(0).getInteger("price");
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not resolve price from plan template {}: {}", planCode, e.getMessage());
                }
            }
            if (resolvedPrice == null) resolvedPrice = 0;

            Instant now = Instant.now();
            Instant activeUntil = now.plus(DAYS_TOTAL, ChronoUnit.DAYS);

            Document billing = new Document();
            billing.put("planCode", planCode);
            billing.put("planName", planName);
            billing.put("planPrice", resolvedPrice);
            billing.put("planStartMs", now.toEpochMilli());
            billing.put("activeUntilMs", activeUntil.toEpochMilli());
            billing.put("status", "active");

            ObjectId oid = parseObjectId(mongoId);
            if (oid == null) {
                Document user = authRepository.findByUserId(mongoId);
                if (user == null) user = authRepository.findByEmail(mongoId);
                if (user == null) {
                    log.warn("Could not find user by id/email '{}', aborting upgradeByCode", mongoId);
                    return;
                }
                oid = user.getObjectId("_id");
            }

            authRepository.updateBillingDocument(oid, billing);
            log.info("Plan upgraded by code for user {}: {} (code {}) @ {}", oid.toHexString(), planName, planCode, resolvedPrice);
        } catch (Exception e) {
            log.error("Error upgrading plan by code for user {}", mongoId, e);
            throw e;
        }
    }

    /**
     * Record a billing history entry for the user.
     * Expects a map with keys like invoiceNumber, status, clientName, total, issuedDate, balance
     */
    public void addBillingHistory(String mongoId, Map<String, Object> entry) {
        try {
            ObjectId oid = parseObjectId(mongoId);
            if (oid == null) {
                Document user = authRepository.findByUserId(mongoId);
                if (user == null) user = authRepository.findByEmail(mongoId);
                if (user == null) {
                    log.warn("Could not find user by id/email '{}', aborting addBillingHistory", mongoId);
                    return;
                }
                oid = user.getObjectId("_id");
            }

            Document doc = new Document(entry);
            // ensure issuedDate stored as ISO string if Date provided
            Object issued = entry.get("issuedDate");
            if (issued instanceof java.util.Date) {
                doc.put("issuedDate", ((java.util.Date) issued).toString());
            }

            authRepository.pushBillingHistory(oid, doc);
            log.info("Appended billing history for user {}", oid.toHexString());
        } catch (Exception e) {
            log.error("Error adding billing history for {}", mongoId, e);
            throw e;
        }
    }

    /**
     * Return the user's billingHistory as a list of maps.
     */
    public List<Map<String, Object>> getBillingHistory(String mongoId) {
        try {
            ObjectId oid = parseObjectId(mongoId);
            Document user = null;
            if (oid != null) {
                user = authRepository.findById(oid);
            } else {
                user = authRepository.findByUserId(mongoId);
                if (user == null) user = authRepository.findByEmail(mongoId);
            }

            if (user == null) return List.of();

            List<Map<String, Object>> out = new java.util.ArrayList<>();
            Object bh = user.get("billingHistory");
            if (bh instanceof List) {
                for (Object o : (List<?>) bh) {
                    if (o instanceof Document) {
                        Document d = (Document) o;
                        Map<String, Object> m = new HashMap<>();
                        for (String k : d.keySet()) m.put(k, d.get(k));
                        out.add(m);
                    }
                }
            }
            return out;
        } catch (Exception e) {
            log.error("Error reading billing history for {}", mongoId, e);
            return List.of();
        }
    }

    private String mapNameToCode(String planName) {
        if (planName == null) return "BASIC";
        String p = planName.trim().toUpperCase();
        switch (p) {
            case "BASIC":
            case "STANDARD":
            case "PREMIUM":
            case "PROPLUS":
                return p;
            case "PRO PLUS":
            case "PRO-PLUS":
            case "PRO+":
                return "PROPLUS";
            default:
                // Map common names
                if (p.contains("BASIC")) return "BASIC";
                if (p.contains("PREMI")) return "PREMIUM";
                if (p.contains("STANDARD")) return "STANDARD";
                if (p.contains("PRO")) return "PROPLUS";
                return "BASIC";
        }
    }

    /**
     * Manually deactivates a user (e.g., admin action or 100% usage).
     */
    public void deactivateUser(String mongoId) {
        try {
            ObjectId oid = parseObjectId(mongoId);
            if (oid == null) {
                Document user = authRepository.findByUserId(mongoId);
                if (user == null) user = authRepository.findByEmail(mongoId);
                if (user == null) {
                    log.warn("Could not find user by id/email '{}', aborting deactivate", mongoId);
                    return;
                }
                oid = user.getObjectId("_id");
            }

            authRepository.updateBillingField(oid, "billing.status", "deactivated");
            log.info("User {} deactivated manually", oid.toHexString());
        } catch (Exception e) {
            log.error("Error deactivating user {}", mongoId, e);
            throw e;
        }
    }

    /**
     * Backfill billing subdocument for users that are missing it.
     * Returns the number of users updated.
     */
    public int backfillMissingBilling() {
        int updated = 0;
        try {
            for (Object o : authRepository.getAll()) {
                if (!(o instanceof Document)) continue;
                Document user = (Document) o;
                ObjectId id = user.getObjectId("_id");
                if (id == null) continue;
                Document billing = (Document) user.get("billing");
                if (billing == null) {
                    Document b = createUserBilling("BASIC");
                    authRepository.updateBillingDocument(id, b);
                    updated++;
                    log.info("Backfilled billing for user {}", id.toHexString());
                }
            }
        } catch (Exception e) {
            log.error("Error during billing backfill", e);
            throw e;
        }
        return updated;
    }

    /**
     * Create a rich plan template Document for the given plan code.
     */
    public Document createPlanTemplate(String planCode) {
        // Try to load from DB plans collection first
        Document existing = planService.getPlanByPlanCode(planCode == null ? "BASIC" : planCode.toUpperCase());
        if (existing != null) return existing;

        Document plan = new Document();
        Instant now = Instant.now();
        switch (planCode == null ? "BASIC" : planCode.toUpperCase()) {
            case "PREMIUM":
                plan.put("planCode", "PREMIUM");
                plan.put("name", "Premium");
                plan.put("currency", "INR");
                plan.put("pricing", List.of(
                    new Document("billingCycle", "monthly").append("price", 4999).append("discountPercentage", 0),
                    new Document("billingCycle", "quarterly").append("price", 19999).append("discountPercentage", 5),
                    new Document("billingCycle", "half_yearly").append("price", 29999).append("discountPercentage", 10),
                    new Document("billingCycle", "yearly").append("price", 59999).append("discountPercentage", 15)
                ));
                plan.put("limits", new Document("maxDoctors", 5));
                break;
            case "STANDARD":
                plan.put("planCode", "STANDARD");
                plan.put("name", "Standard");
                plan.put("currency", "INR");
                plan.put("pricing", List.of(
                    new Document("billingCycle", "monthly").append("price", 1999).append("discountPercentage", 0),
                    new Document("billingCycle", "quarterly").append("price", 7499).append("discountPercentage", 5),
                    new Document("billingCycle", "half_yearly").append("price", 11999).append("discountPercentage", 10),
                    new Document("billingCycle", "yearly").append("price", 23999).append("discountPercentage", 15)
                ));
                plan.put("limits", new Document("maxDoctors", 3));
                break;
            case "PROPLUS":
                plan.put("planCode", "PROPLUS");
                plan.put("name", "ProPlus");
                plan.put("currency", "INR");
                plan.put("pricing", List.of(
                    new Document("billingCycle", "monthly").append("price", 9999).append("discountPercentage", 0),
                    new Document("billingCycle", "quarterly").append("price", 37999).append("discountPercentage", 5),
                    new Document("billingCycle", "half_yearly").append("price", 55999).append("discountPercentage", 10),
                    new Document("billingCycle", "yearly").append("price", 111999).append("discountPercentage", 15)
                ));
                plan.put("limits", new Document("maxDoctors", 10));
                break;
            default:
                // BASIC
                plan.put("planCode", "BASIC");
                plan.put("name", "Basic");
                plan.put("currency", "INR");
                plan.put("pricing", List.of(
                    new Document("billingCycle", "monthly").append("price", 999).append("discountPercentage", 0),
                    new Document("billingCycle", "quarterly").append("price", 3999).append("discountPercentage", 5),
                    new Document("billingCycle", "half_yearly").append("price", 5999).append("discountPercentage", 10),
                    new Document("billingCycle", "yearly").append("price", 11999).append("discountPercentage", 15)
                ));
                plan.put("limits", new Document("maxDoctors", 1));
                break;
        }

        Document features = new Document();
        features.put("whatsappReminders", true);
        features.put("customBranding", false);
        features.put("analytics", true);
        features.put("multiBranch", true);
        features.put("apiAccess", false);
        features.put("whatsappSupport", true);

        plan.put("features", features);
        plan.put("isActive", true);
        plan.put("createdAt", now.toString());
        plan.put("updatedAt", now.toString());

        // persist into plans collection for future reads
        try {
            planService.savePlan(plan);
        } catch (Exception e) {
            log.warn("Could not persist plan template {}: {}", planCode, e.getMessage());
        }

        return plan;
    }

    /**
     * Build a user-specific billing document which embeds the plan template and
     * includes planStart/activeUntil/status fields used by billing logic.
     */
    public Document createUserBilling(String planCode) {
        // Build billing that references a planCode (no embedded snapshot)
        Document planTemplate = createPlanTemplate(planCode);
        Instant now = Instant.now();
        Instant activeUntil = now.plus(DAYS_TOTAL, ChronoUnit.DAYS);

        Document billing = new Document();
        // store planCode for live resolution
        String code = planTemplate.getString("planCode") != null ? planTemplate.getString("planCode") : (planCode == null ? "BASIC" : planCode.toUpperCase());
        billing.put("planCode", code);
        billing.put("planName", planTemplate.getString("name"));
        // store canonical monthly price as quick-access field
        int monthlyPrice = 0;
        try {
            monthlyPrice = ((List<Document>)planTemplate.get("pricing")).get(0).getInteger("price");
        } catch (Exception e) {
            log.warn("Could not read monthly price from plan template {}", code);
        }
        billing.put("planPrice", monthlyPrice);
        billing.put("currency", planTemplate.getString("currency"));
        billing.put("planStartMs", now.toEpochMilli());
        billing.put("activeUntilMs", activeUntil.toEpochMilli());
        billing.put("status", "active");

        return billing;
    }

    // ─── Private helpers ──────────────────────────────────────────────

    private Map<String, Object> buildDefaultBilling() {
        Instant now = Instant.now();
        Map<String, Object> result = new HashMap<>();
        result.put("planName", "Basic");
        result.put("planPrice", 0);
        result.put("currency", "$");
        result.put("activeUntil", now.plus(DAYS_TOTAL, ChronoUnit.DAYS).toEpochMilli());
        result.put("daysUsed", 0);
        result.put("daysTotal", DAYS_TOTAL);
        result.put("status", "active");
        result.put("nearExpiry", false);
        result.put("daysRemaining", DAYS_TOTAL);
        result.put("progressPercent", 0);
        result.put("maxDoctors", PLAN_DOCTOR_LIMITS.getOrDefault("Basic", 1));
        return result;
    }
}
