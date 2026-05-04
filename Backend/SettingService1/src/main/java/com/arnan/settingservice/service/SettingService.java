package com.arnan.settingservice.service;

import com.arnan.settingservice.repository.SettingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class SettingService {

    private static final Logger log = LoggerFactory.getLogger(SettingService.class);

    private final SettingRepository settingRepository;

    public SettingService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public Map<String, Object> saveSettings(String userId, Map<String, Object> payload) {
        log.info("Service request to save settings for userId: {}", userId);
        validatePayload(payload);
        return settingRepository.saveOrUpdate(userId, payload);
    }

    public Map<String, Object> getSettings(String userId) {
        log.info("Service request to fetch settings for userId: {}", userId);
        return settingRepository.findByUserId(userId);
    }

    public Map<String, Object> updateField(String userId, String key, Object value) {
        log.info("Service request to update key '{}' for userId: {}", key, userId);
        return settingRepository.updateSingleField(userId, key, value);
    }

    public void deleteSettings(String userId) {
        log.info("Service request to delete settings for userId: {}", userId);
        settingRepository.deleteByUserId(userId);
    }

    private void validatePayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            throw new IllegalArgumentException("Payload cannot be null or empty");
        }

        Map<String, Object> cleanedPayload = new LinkedHashMap<>(payload);

        cleanedPayload.forEach((key, value) -> {
            if (key == null || key.isBlank()) {
                throw new IllegalArgumentException("Payload contains invalid key");
            }
        });
    }
}