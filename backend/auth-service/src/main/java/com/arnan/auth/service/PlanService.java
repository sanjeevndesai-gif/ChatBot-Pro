package com.arnan.auth.service;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.arnan.auth.repository.PlanRepository;

@Service
public class PlanService {
    @Autowired
    private PlanRepository planRepository;

    public void savePlan(Document planDoc) {
        planRepository.savePlan(planDoc);
    }

    public void updatePlan(String id, Document planDoc) {
        planRepository.updatePlan(id, planDoc);
    }

    public void deletePlan(String id) {
        planRepository.deletePlan(id);
    }

    public java.util.List<Document> getAllPlans() {
        return planRepository.getAllPlans();
    }

    public Document getPlanById(String id) {
        return planRepository.getPlanById(id);
    }
    
    public Document getPlanByPlanCode(String PlanCode) {
        return planRepository.getPlanByPlanCode(PlanCode);
    }

    // --- Convenience wrappers for controller-level operations using planCode ---
    public void updatePlanByCode(String planCode, Document planDoc) {
        planRepository.updateByPlanCode(planCode.toUpperCase(), planDoc);
    }

    public void deletePlanByCode(String planCode) {
        planRepository.deleteByPlanCode(planCode.toUpperCase());
    }
}
