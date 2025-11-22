package com.arnan.i18n.repo;

import com.arnan.i18n.model.Language;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface LanguageRepository extends MongoRepository<Language, String> {
    Optional<Language> findByCode(String code);
}
