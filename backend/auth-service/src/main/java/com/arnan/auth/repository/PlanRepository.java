package com.arnan.auth.repository;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.arnan.auth.configuration.AppConfig;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

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

    private MongoCollection<Document> getPlanCollection() {
        MongoDatabase db = getMongoClient().getDatabase(appConfig.getMongoDatabase());
        return db.getCollection("plans");
    }

    public void savePlan(Document planDoc) {
        getPlanCollection().insertOne(planDoc);
    }

    public void updatePlan(String id, Document planDoc) {
        getPlanCollection().replaceOne(new Document("_id", new org.bson.types.ObjectId(id)), planDoc);
    }

    public void deletePlan(String id) {
        getPlanCollection().deleteOne(new Document("_id", new org.bson.types.ObjectId(id)));
    }

    public java.util.List<Document> getAllPlans() {
        java.util.List<Document> list = new java.util.ArrayList<>();
        for (Document doc : getPlanCollection().find()) {
            list.add(doc);
        }
        return list;
    }

    public Document getPlanById(String id) {
        return getPlanCollection().find(new Document("_id", new org.bson.types.ObjectId(id))).first();
    }

    // Find plan by plan code (string planCode)
    public Document getPlanByPlanCode(String planCode) {
        return getPlanCollection().find(new Document("planCode", planCode)).first();
    }
}
