package com.arnan.i18n.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.arnan.i18n.service.LabelService;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/labels")
public class LabelController {

    private final LabelService labelService;

    public LabelController(LabelService labelService) {
        this.labelService = labelService;
    }

    // ─────────────────────────── GET ─────────────────────────────

    /** GET /labels — all labels */
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<Map<String, Object>> getAll() {
        return labelService.getAll();
    }

    /** GET /labels/{id} — single label by Mongo _id */
    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> getById(@PathVariable String id) {
        return labelService.getById(id);
    }

    /**
     * GET /labels/by-key?key=common.submit&locale=en
     * Returns the single translated value for a key + locale pair.
     */
    @GetMapping("/by-key")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> getByKeyAndLocale(
            @RequestParam String key,
            @RequestParam(defaultValue = "en") String locale) {
        return labelService.getByKeyAndLocale(key, locale);
    }

    /**
     * GET /labels/by-locale?locale=en
     * Returns all labels for a given locale.
     */
    @GetMapping("/by-locale")
    @ResponseStatus(HttpStatus.OK)
    public List<Map<String, Object>> getByLocale(
            @RequestParam(defaultValue = "en") String locale) {
        return labelService.getByLocale(locale);
    }

    /**
     * GET /labels/by-namespace?namespace=common
     * Returns all labels in a namespace (across all locales).
     */
    @GetMapping("/by-namespace")
    @ResponseStatus(HttpStatus.OK)
    public List<Map<String, Object>> getByNamespace(@RequestParam String namespace) {
        return labelService.getByNamespace(namespace);
    }

    /**
     * GET /labels/translate?namespace=common&locale=en
     * Returns a flat key→value map ready for UI consumption.
     */
    @GetMapping("/translate")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, String> translate(
            @RequestParam String namespace,
            @RequestParam(defaultValue = "en") String locale) {
        return labelService.translateNamespace(namespace, locale);
    }

    // ─────────────────────────── POST ────────────────────────────

    /** POST /labels — create a single label */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@RequestBody Map<String, Object> label) {
        return labelService.create(label);
    }

    /**
     * POST /labels/bulk — create or update many labels at once.
     * Existing documents (matched by key + locale) are overwritten.
     */
    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    public List<Map<String, Object>> bulkUpsert(@RequestBody List<Map<String, Object>> labels) {
        return labelService.bulkUpsert(labels);
    }

    // ─────────────────────────── PUT ─────────────────────────────

    /** PUT /labels/{id} — full update of a label */
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public Map<String, Object> update(
            @PathVariable String id,
            @RequestBody Map<String, Object> label) {
        return labelService.update(id, label);
    }

    // ─────────────────────────── DELETE ──────────────────────────

    /** DELETE /labels/{id} */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        labelService.delete(id);
    }
}
