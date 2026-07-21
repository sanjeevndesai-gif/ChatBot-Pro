package com.arnan.auth.repository;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.arnan.auth.configuration.AppConfig;
import com.mongodb.BasicDBObject;
import org.bson.types.ObjectId;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

import static com.mongodb.client.model.Filters.*;

@Repository
public class PlanRepository {

    @Autowired
    private AppConfig appConfig;

    private MongoClient mongoClient;

    private synchronized MongoClient getMongoClient() {
        if (mongoClient == null) {
            String mongodbUri = appConfig.getMongodbUri();
            if (mongodbUri == null || mongodbUri.isBlank()) {
                throw new RuntimeException("MongoDB URI is missing");
            }
            mongoClient = MongoClients.create(mongodbUri);
        }
        return mongoClient;
    }

    private MongoCollection<Document> getCollection() {
        MongoDatabase db = getMongoClient().getDatabase(appConfig.getMongoDatabase());
        return db.getCollection("plans");
    }

    public Document findByPlanCode(String planCode) {
        if (planCode == null) return null;
        return getCollection().find(eq("planCode", planCode)).first();
    }

    public void save(Document plan) {
        getCollection().insertOne(plan);
    }

    public void updateByPlanCode(String planCode, Document plan) {
        getCollection().updateOne(eq("planCode", planCode), new BasicDBObject("$set", plan));
    }

    public void deleteByPlanCode(String planCode) {
        getCollection().deleteOne(eq("planCode", planCode));
    }

    public boolean existsByPlanCode(String planCode) {
        return findByPlanCode(planCode) != null;
    }

    public List<Document> getAll() {
        List<Document> list = new ArrayList<>();
        FindIterable<Document> docs = getCollection().find();
        for (Document d : docs) list.add(d);
        return list;
    }

    // --- Legacy / PlanService compat wrappers ---
    public void savePlan(Document planDoc) {
        // if _id provided, attempt an upsert by _id, else insert
        Object id = planDoc.get("_id");
        if (id != null) {
            try {
                ObjectId oid = (id instanceof ObjectId) ? (ObjectId) id : new ObjectId(id.toString());
                getCollection().updateOne(eq("_id", oid), new BasicDBObject("$set", planDoc));
                return;
            } catch (Exception e) {
                // fallthrough to insert
            }
        }
        save(planDoc);
    }

    public void updatePlan(String id, Document planDoc) {
        try {
            ObjectId oid = new ObjectId(id);
            getCollection().updateOne(eq("_id", oid), new BasicDBObject("$set", planDoc));
        } catch (Exception e) {
            throw new RuntimeException("Invalid id for update", e);
        }
    }

    public void deletePlan(String id) {
        try {
            ObjectId oid = new ObjectId(id);
            getCollection().deleteOne(eq("_id", oid));
        } catch (Exception e) {
            throw new RuntimeException("Invalid id for delete", e);
        }
    }

    public List<Document> getAllPlans() {
        return getAll();
    }

    public Document getPlanById(String id) {
        try {
            ObjectId oid = new ObjectId(id);
            return getCollection().find(eq("_id", oid)).first();
        } catch (Exception e) {
            return null;
        }
    }

    public Document getPlanByPlanCode(String planCode) {
        return findByPlanCode(planCode == null ? null : planCode.toUpperCase());
    }
}
