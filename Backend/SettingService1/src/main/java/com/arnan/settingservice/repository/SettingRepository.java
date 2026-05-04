package com.arnan.settingservice.repository;

import com.arnan.settingservice.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Repository
public class SettingRepository {

    private static final Logger log = LoggerFactory.getLogger(SettingRepository.class);
    private static final String COLLECTION_NAME = "settings";

    private final MongoTemplate mongoTemplate;

    public SettingRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public Map<String, Object> saveOrUpdate(String userId, Map<String, Object> requestData) {
        log.info("Saving settings for userId: {}", userId);

        Query query = new Query(Criteria.where("userId").is(userId));
        Map<?, ?> existing = mongoTemplate.findOne(query, Map.class, COLLECTION_NAME);

        Map<String, Object> dataToSave = new LinkedHashMap<>();

        if (existing != null) {
            for (Map.Entry<?, ?> entry : existing.entrySet()) {
                dataToSave.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }

        dataToSave.put("userId", userId);
        dataToSave.putAll(requestData);
        dataToSave.put("updatedAt", LocalDateTime.now().toString());

        if (!dataToSave.containsKey("createdAt")) {
            dataToSave.put("createdAt", LocalDateTime.now().toString());
        }

        mongoTemplate.save(dataToSave, COLLECTION_NAME);

        log.info("Settings saved successfully for userId: {}", userId);
        return dataToSave;
    }

    public Map<String, Object> findByUserId(String userId) {
        log.info("Fetching settings for userId: {}", userId);

        Query query = new Query(Criteria.where("userId").is(userId));
        Map<String, Object> result = mongoTemplate.findOne(query, Map.class, COLLECTION_NAME);

        if (result == null) {
            throw new ResourceNotFoundException("Settings not found for userId: " + userId);
        }

        return result;
    }

    public Map<String, Object> updateSingleField(String userId, String key, Object value) {
        log.info("Updating single field '{}' for userId: {}", key, userId);

        Map<String, Object> existing = findByUserId(userId);
        existing.put(key, value);
        existing.put("updatedAt", LocalDateTime.now().toString());

        mongoTemplate.save(existing, COLLECTION_NAME);

        log.info("Single field updated successfully for userId: {}", userId);
        return existing;
    }

    public void deleteByUserId(String userId) {
        log.info("Deleting settings for userId: {}", userId);

        Query query = new Query(Criteria.where("userId").is(userId));
        Map<String, Object> existing = mongoTemplate.findOne(query, Map.class, COLLECTION_NAME);

        if (existing == null) {
            throw new ResourceNotFoundException("Settings not found for userId: " + userId);
        }

        mongoTemplate.remove(query, COLLECTION_NAME);
        log.info("Settings deleted successfully for userId: {}", userId);
    }
}