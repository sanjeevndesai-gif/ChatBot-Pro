package com.arnan.i18n.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.arnan.i18n.model.Translation;

public interface TranslationRepository extends MongoRepository<Translation, String>{
	    Optional<Translation> findByKey(String key);
	    void deleteByKey(String key);
	}

