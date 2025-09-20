package com.arnan.i18n.service;

import java.util.Optional;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.arnan.i18n.model.Translation;
import com.arnan.i18n.repository.TranslationRepository;

@Service
public class TranslationService {

	private final TranslationRepository repository;

	public TranslationService(TranslationRepository repository) {
		this.repository = repository;
	}

	@Cacheable(value = "translations", key = "#key + ':' + #lang")
	public String getMessage(String key, String lang) {
		Optional<Translation> opt = repository.findByKey(key);
		if (opt.isEmpty())
			return "Message not found for key: " + key;
		Translation t = opt.get();
		if (t.getMessages() == null)
			return "Message not found for key: " + key;
		String text = t.getMessages().get(lang);
		if (text != null)
			return text;
		text = t.getMessages().get("en");
		return text != null ? text : "Message not found for key: " + key;
	}

	@CacheEvict(value = "translations", allEntries = true)
	public Translation save(Translation translation) {
		return repository.save(translation);
	}

	@CacheEvict(value = "translations", allEntries = true)
	public void deleteByKey(String key) {
		repository.deleteByKey(key);
	}

	public Page<Translation> findAll(Pageable pageable) {
		return repository.findAll(pageable);
	}

}
