package com.arnan.i18n.config;

import java.util.Map;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import com.arnan.i18n.model.Translation;
import com.arnan.i18n.repository.TranslationRepository;

@Configuration
public class DataLoader implements CommandLineRunner {

	private final TranslationRepository repository;

	public DataLoader(TranslationRepository repository) {
		this.repository = repository;
	}

	@Override
	public void run(String... args) throws Exception {
		// Only load if collection empty
		if (repository.count() == 0) {
			repository.save(new Translation("greeting.hello", Map.of("en", "Hello", "hi", "नमस्ते", "es", "Hola")));
			repository.save(new Translation("farewell.goodbye", Map.of("en", "Goodbye", "hi", "अलविदा")));
			System.out.println("Loaded sample translations into MongoDB");
		}
	}
}
