package com.arnan.i18n.repo;

import com.arnan.i18n.model.Translation;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface TranslationRepository extends MongoRepository<Translation, String> {

    Optional<Translation> findByKey(String key);

    void deleteByKey(String key);
}
