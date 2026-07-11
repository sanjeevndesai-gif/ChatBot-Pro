package com.arnan.book_appointment.repository;

import com.arnan.book_appointment.config.AppConfig;
import com.mongodb.client.*;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;

import static com.mongodb.client.model.Filters.eq;
import java.util.Arrays;
import java.util.regex.Pattern;

@Repository
public class SchedulerRepository {

    @Autowired
    private AppConfig appConfig;

    private MongoClient mongoClient;

    private MongoClient getClient() {
        if (mongoClient == null) {
            mongoClient = MongoClients.create(appConfig.getMongodbUri());
        }
        return mongoClient;
    }

    private MongoCollection<Document> getCollection() {
        return getClient()
                .getDatabase(appConfig.getMongoDatabase())
                .getCollection(appConfig.getSchedulerCollection());
    }

    public void save(Document doc) {
        getCollection().insertOne(doc);
    }

    public Document findById(ObjectId id) {
        return getCollection().find(eq("_id", id)).first();
    }

    public List<Document> findAll() {
        List<Document> list = new ArrayList<>();
        getCollection().find().forEach(list::add);
        return list;
    }

    /**
     * Find schedulers that contain at least one slot created by the given user id.
     * Only the existence of matching nested slots is tested here; the caller
     * may further prune the nested arrays to include only matching slots.
     */
    public List<Document> findBySlotCreator(String createdBy) {
        List<Document> list = new ArrayList<>();
        // Try many common nested paths and also a regex fallback to handle
        // string variations (extra whitespace, stringified JSON, different id field names)
        List<String> paths = Arrays.asList(
                "daySlots.slots.createdBy",
                "daySlots.slots.createdBy.id",
                "daySlots.slots.createdBy._id",
                "daySlots.slots.createdBy.userId",

                "resourceSchedules.daySlots.slots.createdBy",
                "resourceSchedules.daySlots.slots.createdBy.id",
                "resourceSchedules.daySlots.slots.createdBy._id",
                "resourceSchedules.daySlots.slots.createdBy.userId",

                // sometimes createdBy is stored at resourceSchedules level
                "resourceSchedules.createdBy",
                "resourceSchedules.createdBy.id",

                // scheduler-level createdBy
                "createdBy",
                "createdBy.id",
                "createdBy._id",
                "createdBy.userId"
        );

        List<Document> ors = new ArrayList<>();

        // Build a "contains" regex so we match values that may include
        // punctuation, trailing commas, or stringified objects that contain
        // the id as a substring. This is more permissive than an exact match.
        Pattern containsRegex = null;
        try {
            String patternStr = ".*" + Pattern.quote(createdBy) + ".*";
            containsRegex = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
        } catch (Exception e) {
            containsRegex = null;
        }

        for (String p : paths) {
            // exact match first
            ors.add(new Document(p, createdBy));
            // then a contains regex fallback
            if (containsRegex != null) {
                ors.add(new Document(p, containsRegex));
            }
        }

        Document filter = new Document("$or", ors);
        getCollection().find(filter).forEach(list::add);

        return list;
    }
  
    public void update(Document doc, ObjectId id) {
        doc.put("_id", id);
        getCollection().replaceOne(eq("_id", id), doc );
    }

    public void delete(ObjectId id) {
        getCollection().deleteOne(eq("_id", id));
    }
}