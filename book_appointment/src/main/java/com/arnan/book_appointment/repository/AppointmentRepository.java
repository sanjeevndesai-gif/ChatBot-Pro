package com.arnan.book_appointment.repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import com.arnan.book_appointment.config.AppConfig;
import com.mongodb.BasicDBObject;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

import static com.mongodb.client.model.Filters.*;

@Repository
public class AppointmentRepository {

    @Autowired
    private AppConfig appConfig;

    private MongoClient mongoClient;

    private MongoClient getMongoClient() {

        if (mongoClient == null) {

            String mongodbUri = appConfig.getMongodbUri();

            if (mongodbUri != null && mongodbUri.startsWith("mongodb://")) {
                mongoClient = MongoClients.create(mongodbUri);
            } else {
                String host = mongodbUri;
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

    public List<Document> getAll() {

        List<Document> list = new ArrayList<>();

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

    public List<Document> findByDateRange(LocalDate from, LocalDate to) {

        Bson filter = and(
                gte("appointmentDate", from.toString()),
                lte("appointmentDate", to.toString())
        );

        FindIterable<Document> docs = getCollection().find(filter);

        List<Document> list = new ArrayList<>();
        for (Document d : docs) {
            list.add(d);
        }

        return list;
    }

    public void update(Document doc, ObjectId id) {

        Bson filter = eq("_id", id);
        BasicDBObject update = new BasicDBObject("$set", doc);

        getCollection().updateOne(filter, update);
    }

    public void delete(ObjectId id) {
        getCollection().deleteOne(eq("_id", id));
    }
}
