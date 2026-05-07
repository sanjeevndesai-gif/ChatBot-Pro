package com.arnan.auth.repository;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.arnan.auth.configuration.AppConfig;
import com.mongodb.BasicDBObject;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

import static com.mongodb.client.model.Filters.*;

@Repository
public class AuthRepository {

    @Autowired
    private AppConfig appConfig;

    private MongoClient mongoClient;

    private MongoClient getMongoClient() {
        if (mongoClient == null) {

            String mongodbUri = appConfig.getMongodbUri();

            // ✅ If config already has full URI like mongodb://localhost:27017
            if (mongodbUri != null && mongodbUri.startsWith("mongodb://")) {
                mongoClient = MongoClients.create(mongodbUri);
            }
            // ✅ If config is only host like localhost
            else {
                String host = mongodbUri; // old config value
                int port = appConfig.getMongodbPort();

                String finalUri = "mongodb://" + host + ":" + port;
                mongoClient = MongoClients.create(finalUri);
            }
        }
        return mongoClient;
    }

    private MongoCollection<Document> getCollection() {
        MongoDatabase db = getMongoClient().getDatabase(appConfig.getMongoDatabase());
        return db.getCollection(appConfig.getCollection());
    }

    public List<Object> getAll() {
        List<Object> list = new ArrayList<>();
        FindIterable<Document> docs = getCollection().find();
        for (Document d : docs) {
            list.add(d);
        }
        return list;
    }

    public void save(Document doc) {
        getCollection().insertOne(doc);
    }

    public Document findById(ObjectId id) {
        return getCollection().find(eq("_id", id)).first();
    }

    public Document findByName(String name, String orgId) {
        return getCollection().find(and(eq("name", name), eq("orgId", orgId))).first();
    }
    public Document findByEmail(String email) {
        return getCollection().find(eq("email", email)).first();
    }
    public Document findByEmailOrUserId(String value) {
        return getCollection().find(
                or(eq("email", value), eq("userId", value))
        ).first();
    }
    public Document findDuplicateUser(String email, String phone) {

        return getCollection().find(
                or(
                    eq("email", email),
                    eq("phone_number", phone)
                )
        ).first();
    }

    public void update(Document doc, String orgId, ObjectId id) {
        Bson filter = and(eq("_id", id), eq("orgId", orgId));
        BasicDBObject update = new BasicDBObject("$set", doc);
        getCollection().updateOne(filter, update);
    }

    public void delete(ObjectId id) {
        getCollection().deleteOne(eq("_id", id));
    }

}
