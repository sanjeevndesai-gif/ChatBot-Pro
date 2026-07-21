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

    /**
     * Creates MongoClient using full MongoDB URI directly.
     * Supports mongodb+srv:// Atlas connections.
     */
    private synchronized MongoClient getMongoClient() {

        if (mongoClient == null) {

            String mongodbUri = appConfig.getMongodbUri();

            if (mongodbUri == null || mongodbUri.isBlank()) {
                throw new RuntimeException("MongoDB URI is missing");
            }

            System.out.println("Connecting to MongoDB using URI: " + mongodbUri);

            mongoClient = MongoClients.create(mongodbUri);
        }

        return mongoClient;
    }

    private MongoCollection<Document> getCollection() {

        MongoDatabase db =
                getMongoClient()
                        .getDatabase(appConfig.getMongoDatabase());

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

        return getCollection().find(
                and(
                        eq("name", name),
                        eq("orgId", orgId)
                )
        ).first();
    }

    public Document findByEmail(String email) {
        return getCollection().find(eq("email", email)).first();
    }

    public Document findByUserId(String userId) {
        return getCollection().find(eq("userId", userId)).first();
    }

    public Document findByPhone(String phone) {
        return getCollection().find(eq("phone", phone)).first();
    }

    public Document findByEmailOrUserId(String value) {

        return getCollection().find(
                or(
                        eq("email", value),
                        eq("userId", value)
                )
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

        Bson filter =
                and(
                        eq("_id", id),
                        eq("orgId", orgId)
                );

        BasicDBObject update =
                new BasicDBObject("$set", doc);

        getCollection().updateOne(filter, update);
    }

    public void updateById(ObjectId id, Document doc) {

        Bson filter = eq("_id", id);

        BasicDBObject update =
                new BasicDBObject("$set", doc);

        getCollection().updateOne(filter, update);
    }

    public void delete(ObjectId id) {
        getCollection().deleteOne(eq("_id", id));
    }

    /**
     * Stores billing sub-document
     */
    public void updateBillingDocument(
            ObjectId id,
            Document billingDoc
    ) {

        Bson filter = eq("_id", id);

        BasicDBObject update =
                new BasicDBObject(
                        "$set",
                        new Document("billing", billingDoc)
                );

        getCollection().updateOne(filter, update);
    }

    /**
     * Updates single billing field
     */
    public void updateBillingField(
            ObjectId id,
            String fieldPath,
            Object value
    ) {

        Bson filter = eq("_id", id);

        BasicDBObject update =
                new BasicDBObject(
                        "$set",
                        new Document(fieldPath, value)
                );

        getCollection().updateOne(filter, update);
    }

    // Fetch all users by createdBy (admin userId)
    public List<Object> getAllByCreatedBy(String createdBy) {
        List<Object> list = new ArrayList<>();
        FindIterable<Document> docs = getCollection().find(eq("createdBy", createdBy));
        for (Document d : docs) {
            list.add(d);
        }
        return list;
    }
}