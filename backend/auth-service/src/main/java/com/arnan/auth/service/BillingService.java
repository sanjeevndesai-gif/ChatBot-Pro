package com.arnan.auth.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.arnan.auth.repository.AuthRepository;

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

    /**
     * Returns the billing/plan info for a user.
     * Computes daysUsed dynamically from planStartDate stored in DB.
     * Defaults to Basic plan if no billing info exists.
     * Auto-marks deactivated when daysUsed >= daysTotal.
     */
    public Map<String, Object> getBilling(String mongoId) {
        try {
            Document user = authRepository.findById(new ObjectId(mongoId));
            if (user == null) {
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
                Document update = new Document("billing.status", "deactivated");
                authRepository.updateBillingField(new ObjectId(mongoId), "billing.status", "deactivated");
                log.info("User {} auto-deactivated: usage 100%", mongoId);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("planName", billing.getString("planName") != null ? billing.getString("planName") : "Basic");
            result.put("planPrice", billing.getInteger("planPrice") != null ? billing.getInteger("planPrice") : 0);
            result.put("currency", "$");
            result.put("activeUntil", billing.getLong("activeUntilMs") != null ? billing.getLong("activeUntilMs") : Instant.now().plus(DAYS_TOTAL, ChronoUnit.DAYS).toEpochMilli());
            result.put("daysUsed", (int) daysUsed);
            result.put("daysTotal", DAYS_TOTAL);
            result.put("status", status);
            // Warning flag: 80% threshold
            result.put("nearExpiry", daysUsed >= (long)(DAYS_TOTAL * 0.8) && daysUsed < DAYS_TOTAL);

            String planNameForLimit = billing.getString("planName") != null ? billing.getString("planName") : "Basic";
            result.put("maxDoctors", PLAN_DOCTOR_LIMITS.getOrDefault(planNameForLimit, 1));

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
            billing.put("planName", planName);
            billing.put("planPrice", planPrice);
            billing.put("planStartMs", now.toEpochMilli());
            billing.put("activeUntilMs", activeUntil.toEpochMilli());
            billing.put("status", "active");

            authRepository.updateBillingDocument(new ObjectId(mongoId), billing);
            log.info("Plan upgraded for user {}: {} @ ${}", mongoId, planName, planPrice);
        } catch (Exception e) {
            log.error("Error upgrading plan for user {}", mongoId, e);
            throw e;
        }
    }

    /**
     * Manually deactivates a user (e.g., admin action or 100% usage).
     */
    public void deactivateUser(String mongoId) {
        try {
            authRepository.updateBillingField(new ObjectId(mongoId), "billing.status", "deactivated");
            log.info("User {} deactivated manually", mongoId);
        } catch (Exception e) {
            log.error("Error deactivating user {}", mongoId, e);
            throw e;
        }
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
        result.put("maxDoctors", PLAN_DOCTOR_LIMITS.getOrDefault("Basic", 1));
        return result;
    }
}
