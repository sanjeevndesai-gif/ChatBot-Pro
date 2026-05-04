package com.arnan.userservice.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class MongoIndexConfig {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void initIndexes() {

        log.info("Creating MongoDB indexes...");

        // auth_users indexes
        mongoTemplate.indexOps("auth_users")
                .ensureIndex(new Index().on("email", Sort.Direction.ASC).unique());

        mongoTemplate.indexOps("auth_users")
                .ensureIndex(new Index().on("registrationId", Sort.Direction.ASC).unique());

        // refresh tokens
        mongoTemplate.indexOps("refresh_tokens")
                .ensureIndex(new Index().on("token", Sort.Direction.ASC).unique());

        // tenant index for fast queries
        mongoTemplate.indexOps("app_users")
                .ensureIndex(new Index().on("registrationId", Sort.Direction.ASC));

        log.info("MongoDB indexes created.");
    }
}