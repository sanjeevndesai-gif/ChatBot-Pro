package com.arnan.i18n.service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.arnan.i18n.exception.NotFoundException;
import com.arnan.i18n.repository.LabelRepository;

@Service
public class LabelService {

    private static final Logger log = LoggerFactory.getLogger(LabelService.class);

    private final LabelRepository labelRepository;

    public LabelService(LabelRepository labelRepository) {
        this.labelRepository = labelRepository;
    }

    // ─────────────────────────── READ ────────────────────────────

    public List<Map<String, Object>> getAll() {
        log.info("Fetching all labels");
        return labelRepository.findAll();
    }

    public Map<String, Object> getById(String id) {
        return labelRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Label not found with id: " + id));
    }

    public Map<String, Object> getByKeyAndLocale(String key, String locale) {
        return labelRepository.findByKeyAndLocale(key, normaliseLocale(locale))
                .orElseThrow(() -> new NotFoundException(
                        "Label not found for key='" + key + "' locale='" + locale + "'"));
    }

    public List<Map<String, Object>> getByLocale(String locale) {
        log.info("Fetching all labels for locale={}", locale);
        return labelRepository.findByLocale(normaliseLocale(locale));
    }

    public List<Map<String, Object>> getByNamespace(String namespace) {
        log.info("Fetching all labels for namespace={}", namespace);
        return labelRepository.findByNamespace(namespace);
    }

    /**
     * Returns a flat key→value map ready for front-end consumption.
     * Example: GET /labels/translate?locale=en&namespace=common
     * → { "common.submit": "Submit", "common.cancel": "Cancel", ... }
     */
    public Map<String, String> translateNamespace(String namespace, String locale) {
        List<Map<String, Object>> labels = labelRepository.findByNamespaceAndLocale(namespace, normaliseLocale(locale));
        Map<String, String> result = new LinkedHashMap<>();
        labels.forEach(l -> {
            String key = valueAsString(l.get("key"));
            String value = valueAsString(l.get("value"));
            if (!key.isBlank()) {
                result.put(key, value);
            }
        });
        return result;
    }

    // ─────────────────────────── WRITE ───────────────────────────

    public Map<String, Object> create(Map<String, Object> label) {
        String key = requireString(label, "key");
        String locale = normaliseLocale(requireString(label, "locale"));
        String value = requireString(label, "value");
        String namespace = optionalString(label, "namespace");

        if (labelRepository.existsByKeyAndLocale(key, locale)) {
            throw new RuntimeException(
                    "Label already exists for key='" + key +
                    "' locale='" + locale + "'");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("key", key);
        payload.put("locale", locale);
        payload.put("value", value);
        if (!namespace.isBlank()) {
            payload.put("namespace", namespace);
        }
        payload.put("createdAt", Instant.now());
        payload.put("updatedAt", Instant.now());

        log.info("Creating label key={} locale={}", key, locale);
        return labelRepository.save(payload);
    }

    public Map<String, Object> update(String id, Map<String, Object> updated) {
        Map<String, Object> existing = getById(id);

        String key = requireString(updated, "key");
        String locale = normaliseLocale(requireString(updated, "locale"));
        String value = requireString(updated, "value");
        String namespace = optionalString(updated, "namespace");

        if (labelRepository.existsByKeyAndLocaleExcludingId(key, locale, id)) {
            throw new RuntimeException(
                    "Label already exists for key='" + key +
                    "' locale='" + locale + "'");
        }

        existing.put("key", key);
        existing.put("locale", locale);
        existing.put("value", value);
        existing.put("namespace", namespace);
        existing.put("updatedAt", Instant.now());

        log.info("Updating label id={}", id);
        return labelRepository.update(id, existing);
    }

    public void delete(String id) {
        if (!labelRepository.existsById(id)) {
            throw new NotFoundException("Label not found with id: " + id);
        }
        log.info("Deleting label id={}", id);
        labelRepository.deleteById(id);
    }

    /**
     * Bulk upsert — accepts a list of labels and saves each one.
     * If a document with the same key+locale already exists it is overwritten.
     */
    public List<Map<String, Object>> bulkUpsert(List<Map<String, Object>> labels) {
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (Map<String, Object> label : labels) {
            String key = requireString(label, "key");
            String locale = normaliseLocale(requireString(label, "locale"));
            String value = requireString(label, "value");
            String namespace = optionalString(label, "namespace");

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("key", key);
            payload.put("locale", locale);
            payload.put("value", value);
            if (!namespace.isBlank()) {
                payload.put("namespace", namespace);
            }
            payload.put("updatedAt", Instant.now());

            Map<String, Object> saved = labelRepository.findByKeyAndLocale(key, locale)
                    .map(existing -> {
                        payload.put("createdAt", existing.getOrDefault("createdAt", Instant.now()));
                        return labelRepository.update(valueAsString(existing.get("id")), payload);
                    })
                    .orElseGet(() -> {
                        payload.put("createdAt", Instant.now());
                        return labelRepository.save(payload);
                    });
            result.add(saved);
        }
        log.info("Bulk upserting {} labels", result.size());
        return result;
    }

    // ─────────────────────────── UTILS ───────────────────────────

    private String normaliseLocale(String locale) {
        return locale == null ? "en" : locale.trim().toLowerCase();
    }

    private String requireString(Map<String, Object> data, String key) {
        String value = valueAsString(data.get(key));
        if (value.isBlank()) {
            throw new RuntimeException(key + " is required");
        }
        return value;
    }

    private String optionalString(Map<String, Object> data, String key) {
        return valueAsString(data.get(key));
    }

    private String valueAsString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
