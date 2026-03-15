package com.arnan.auth.util;

import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.FindOneAndUpdateOptions;

import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Updates.inc;

@Component
public class MongoSequenceGenerator {

    @Autowired
    MongoClient mongoClient;

    private MongoCollection<Document> getCollection() {
        MongoDatabase db = mongoClient.getDatabase("auth-service");
        return db.getCollection("counters");
    }

    public long getNextSequence(String name) {

        Document result = getCollection().findOneAndUpdate(
                eq("_id", name),
                inc("seq", 1),
                new FindOneAndUpdateOptions()
                        .upsert(true)
                        .returnDocument(com.mongodb.client.model.ReturnDocument.AFTER)
        );

        // ✅ FIX: handle Integer / Long safely
        Number seq = (Number) result.get("seq");

        return seq.longValue();
    }

}
