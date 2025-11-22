package com.arnan.i18n.controller;

import com.arnan.i18n.model.Language;
import com.arnan.i18n.model.Translation;
import com.arnan.i18n.repo.TranslationRepository;
import com.arnan.i18n.service.I18nService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/i18n")
public class I18nController {

    private static final Logger log = LoggerFactory.getLogger(I18nController.class);

    private final I18nService i18nService;
    private final TranslationRepository translationRepo;

    public I18nController(I18nService i18nService, TranslationRepository translationRepo) {
        this.i18nService = i18nService;
        this.translationRepo = translationRepo;
    }

    // ======================================================
    // PUBLIC APIs
    // ======================================================

    @GetMapping("/languages")
    public ResponseEntity<List<Language>> languages() {
        System.out.println(">>> /languages endpoint called");
        List<Language> list = i18nService.getAllLanguages();
        System.out.println(">>> languages from service: " + list);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/translations")
    public ResponseEntity<Map<String,String>> translations(
            @RequestParam(name="lang", defaultValue="en") String lang) {

        log.debug("GET translations for {}", lang);
        return ResponseEntity.ok(i18nService.getTranslationsForLanguage(lang));
    }

    @GetMapping("/translation/{key}")
    public ResponseEntity<String> translation(
            @PathVariable String key,
            @RequestParam(name="lang", defaultValue="en") String lang) {

        log.debug("GET translation {} for {}", key, lang);
        return i18nService.getTranslation(key, lang)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ======================================================
    // ADMIN APIs
    // ======================================================

    // Add a new translation
    @PostMapping("/admin/translation")
    public ResponseEntity<?> addTranslation(@RequestBody Translation translation) {
        log.info("Admin add translation: {}", translation.getKey());
        Translation saved = translationRepo.save(translation);
        i18nService.evictTranslations();
        return ResponseEntity.ok(saved);
    }

    // Update existing translation
    @PutMapping("/admin/translation/{key}")
    public ResponseEntity<?> updateTranslation(
            @PathVariable String key,
            @RequestBody Translation translation) {

        log.info("Admin updating translation: {}", key);

        Translation existing = translationRepo.findByKey(key)
                .orElseThrow(() -> new RuntimeException("Key not found"));

        existing.setMessages(translation.getMessages());
        Translation updated = translationRepo.save(existing);

        i18nService.evictTranslations();
        return ResponseEntity.ok(updated);
    }

    // Delete translation
    @DeleteMapping("/admin/translation/{key}")
    public ResponseEntity<?> deleteTranslation(@PathVariable String key) {
        log.info("Admin deleting translation: {}", key);
        translationRepo.deleteByKey(key);
        i18nService.evictTranslations();
        return ResponseEntity.ok("Deleted");
    }

    // Clear cache
    @PostMapping("/admin/clear-cache")
    public ResponseEntity<String> clearCache() {
        log.info("Admin clear cache triggered");
        i18nService.evictTranslations();
        i18nService.evictLanguages();
        return ResponseEntity.ok("Caches cleared");
    }
}
