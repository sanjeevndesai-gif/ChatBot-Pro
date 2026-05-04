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
 
    public void update(Document doc, ObjectId id) {

        getCollection().replaceOne(eq("_id", id), doc);

    }
 
    public void delete(ObjectId id) {

        getCollection().deleteOne(eq("_id", id));

    }

}
 