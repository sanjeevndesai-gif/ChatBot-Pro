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

    /**
     * Append an entry to the user's billingHistory array.
     */
    public void pushBillingHistory(ObjectId id, Document historyEntry) {
        Bson filter = eq("_id", id);
        BasicDBObject update = new BasicDBObject("$push", new BasicDBObject("billingHistory", historyEntry));
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

    // New: find pending approvals with paging and sorting, excluding admin users
    public List<Document> findPendingApprovals(int page, int size) {
        List<Document> result = new ArrayList<>();
        BasicDBObject sort = new BasicDBObject("createdDate", -1);

        FindIterable<Document> docs = getCollection().find(
                and(
                        eq("status", "pending"),
                        ne("role", "admin"),
                        ne("roles", "admin")
                )
        ).sort(sort).skip(page * size).limit(size);

        for (Document d : docs) result.add(d);
        return result;
    }

    // New: count pending approvals excluding admin users
    public long countPendingApprovals() {
        return getCollection().countDocuments(
                and(
                        eq("status", "pending"),
                        ne("role", "admin"),
                        ne("roles", "admin")
                )
        );
    }

    // New: insert an approvals audit record
    public void insertApprovalAudit(Document audit) {
        MongoDatabase db = getMongoClient().getDatabase(appConfig.getMongoDatabase());
        db.getCollection("approvals_audit").insertOne(audit);
    }

    // New: count clinics (separate collection)
    public long countClinics() {
        MongoDatabase db = getMongoClient().getDatabase(appConfig.getMongoDatabase());
        return db.getCollection("clinics").countDocuments();
    }

    // New: run native aggregation pipeline on `auth` collection and return first document
    public Document aggregateOverview(List<Document> pipeline) {
        MongoDatabase db = getMongoClient().getDatabase(appConfig.getMongoDatabase());
        return db.getCollection(appConfig.getCollection()).aggregate(pipeline).first();
    }

    // New: insert a clinic document into `clinics` collection and return inserted _id
    public ObjectId insertClinic(Document clinic) {
        MongoDatabase db = getMongoClient().getDatabase(appConfig.getMongoDatabase());
        db.getCollection("clinics").insertOne(clinic);
        ObjectId oid = clinic.getObjectId("_id");
        return oid;
    }
}