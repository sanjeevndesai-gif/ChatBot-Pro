package com.arnan.i18n.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.arnan.i18n.dto.TranslationRequest;
import com.arnan.i18n.dto.TranslationResponse;
import com.arnan.i18n.model.Translation;
import com.arnan.i18n.service.TranslationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/i18n")
public class TranslationController {

	private final TranslationService service;

	public TranslationController(TranslationService service) {
		this.service = service;
	}

	@Operation(summary = "Get translated message by key and lang (default en)")
	@GetMapping("/{key}")
	public ResponseEntity<String> getMessage(@PathVariable String key, @RequestParam(defaultValue = "en") String lang) {
		String value = service.getMessage(key, lang);
		return ResponseEntity.ok(value);
	}

	@Operation(summary = "Save or update a translation")
	@PostMapping
	public ResponseEntity<TranslationResponse> save(@Valid @RequestBody TranslationRequest request) {
		Translation saved = service.save(new Translation(request.getKey(), request.getMessages()));
		return ResponseEntity.ok(new TranslationResponse(saved.getKey(), saved.getMessages()));
	}

	@Operation(summary = "Delete translation by key")
	@DeleteMapping("/{key}")
	public ResponseEntity<Void> delete(@PathVariable String key) {
		service.deleteByKey(key);
		return ResponseEntity.noContent().build();
	}

	@Operation(summary = "List translations (paged)")
	@GetMapping
	public ResponseEntity<Page<TranslationResponse>> list(Pageable pageable) {
		Page<Translation> page = service.findAll(pageable);
		Page<TranslationResponse> dtoPage = page.map(t -> new TranslationResponse(t.getKey(), t.getMessages()));
		return ResponseEntity.ok(dtoPage);
	}
}
