package com.arnan.i18n.repository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.CompoundIndexDefinition;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;

@Repository
public class LabelRepository {

    private static final String COLLECTION = "labels";

    private final MongoTemplate mongoTemplate;

    public LabelRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @PostConstruct
    public void ensureIndexes() {
        mongoTemplate.indexOps(COLLECTION).ensureIndex(
                new CompoundIndexDefinition(new Document("key", 1).append("locale", 1)).unique());
    }

    public List<Map<String, Object>> findAll() {
        return mapList(mongoTemplate.findAll(Document.class, COLLECTION));
    }

    public Optional<Map<String, Object>> findById(String id) {
        Query query = new Query(Criteria.where("_id").is(toObjectIdOrRaw(id)));
        return Optional.ofNullable(mongoTemplate.findOne(query, Document.class, COLLECTION)).map(this::toMap);
    }

    public Optional<Map<String, Object>> findByKeyAndLocale(String key, String locale) {
        Query query = new Query(Criteria.where("key").is(key).and("locale").is(locale));
        return Optional.ofNullable(mongoTemplate.findOne(query, Document.class, COLLECTION)).map(this::toMap);
    }

    public List<Map<String, Object>> findByLocale(String locale) {
        Query query = new Query(Criteria.where("locale").is(locale));
        return mapList(mongoTemplate.find(query, Document.class, COLLECTION));
    }

    public List<Map<String, Object>> findByNamespace(String namespace) {
        Query query = new Query(Criteria.where("namespace").is(namespace));
        return mapList(mongoTemplate.find(query, Document.class, COLLECTION));
    }

    public List<Map<String, Object>> findByNamespaceAndLocale(String namespace, String locale) {
        Query query = new Query(Criteria.where("namespace").is(namespace).and("locale").is(locale));
        return mapList(mongoTemplate.find(query, Document.class, COLLECTION));
    }

    public boolean existsById(String id) {
        Query query = new Query(Criteria.where("_id").is(toObjectIdOrRaw(id)));
        return mongoTemplate.exists(query, COLLECTION);
    }

    public boolean existsByKeyAndLocale(String key, String locale) {
        Query query = new Query(Criteria.where("key").is(key).and("locale").is(locale));
        return mongoTemplate.exists(query, COLLECTION);
    }

    public boolean existsByKeyAndLocaleExcludingId(String key, String locale, String excludeId) {
        Query query = new Query(Criteria.where("key").is(key).and("locale").is(locale)
                .and("_id").ne(toObjectIdOrRaw(excludeId)));
        return mongoTemplate.exists(query, COLLECTION);
    }

    public Map<String, Object> save(Map<String, Object> payload) {
        if (!payload.containsKey("createdAt")) {
            payload.put("createdAt", Instant.now());
        }
        payload.put("updatedAt", Instant.now());
        Document saved = mongoTemplate.save(new Document(payload), COLLECTION);
        return toMap(saved);
    }

    public Map<String, Object> update(String id, Map<String, Object> payload) {
        Document doc = new Document(payload);
        doc.put("_id", toObjectIdOrRaw(id));
        Document saved = mongoTemplate.save(doc, COLLECTION);
        return toMap(saved);
    }

    public void deleteById(String id) {
        Query query = new Query(Criteria.where("_id").is(toObjectIdOrRaw(id)));
        mongoTemplate.remove(query, COLLECTION);
    }

    private List<Map<String, Object>> mapList(List<Document> docs) {
        return docs.stream().map(this::toMap).toList();
    }

    private Map<String, Object> toMap(Document doc) {
        Map<String, Object> map = new java.util.LinkedHashMap<>(doc);
        Object id = map.remove("_id");
        map.put("id", id == null ? null : String.valueOf(id));
        return map;
    }

    private Object toObjectIdOrRaw(String id) {
        try {
            return new ObjectId(id);
        } catch (IllegalArgumentException ex) {
            return id;
        }
    }
}
