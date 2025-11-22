package com.arnan.i18n.service;

import com.arnan.i18n.model.Language;
import com.arnan.i18n.model.Translation;
import com.arnan.i18n.repo.LanguageRepository;
import com.arnan.i18n.repo.TranslationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class I18nService {

    private static final Logger log = LoggerFactory.getLogger(I18nService.class);

    private final LanguageRepository languageRepo;
    private final TranslationRepository translationRepo;

    @Autowired
    private MongoTemplate mongoTemplate;  // Added missing import

    public I18nService(LanguageRepository languageRepo, TranslationRepository translationRepo) {
        this.languageRepo = languageRepo;
        this.translationRepo = translationRepo;
    }

    // =======================
    //      LANGUAGES
    // =======================

    @Cacheable("languages")
    public List<Language> getAllLanguages() {

        System.out.println(">>> Loading languages from MongoDB...");
        System.out.println(">>> Connected physical DB name = " + mongoTemplate.getDb().getName());
        System.out.println(">>> Collections in DB = "
                + mongoTemplate.getDb().listCollectionNames().into(new ArrayList<>()));

        List<Language> langs = languageRepo.findAll();
        System.out.println(">>> Found languages in DB = " + langs.size());

        return langs;
    }

    // =======================
    //      TRANSLATIONS
    // =======================

    @Cacheable(value = "translations", key = "#lang")
    public Map<String, String> getTranslationsForLanguage(String lang) {

        log.info("Loading translations for language={}", lang);
        List<Translation> all = translationRepo.findAll();

        Map<String, String> map = new HashMap<>();

        for (Translation t : all) {

            String value = null;

            if (t.getMessages() != null) {
                value = t.getMessages().get(lang);    // requested language
                if (value == null) value = t.getMessages().get("en"); // fallback
            }

            if (value == null) value = t.getKey();  // final fallback

            map.put(t.getKey(), value);
        }

        log.debug("Loaded {} translations for {}", map.size(), lang);
        return map;
    }

    public Optional<String> getTranslation(String key, String lang) {

        return translationRepo.findByKey(key).map(t -> {
            String value = null;

            if (t.getMessages() != null) {
                value = t.getMessages().get(lang);
                if (value == null) value = t.getMessages().get("en");
            }

            return value == null ? t.getKey() : value;
        });
    }

    // =======================
    //      CACHE OPERATIONS
    // =======================

    @CacheEvict(value = "translations", allEntries = true)
    public void evictTranslations() {
        log.info("Evicted translations cache");
    }

    @CacheEvict(value = "languages", allEntries = true)
    public void evictLanguages() {
        log.info("Evicted languages cache");
    }
}
