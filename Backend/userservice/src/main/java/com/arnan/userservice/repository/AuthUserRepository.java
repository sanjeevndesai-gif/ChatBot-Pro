package com.arnan.userservice.repository;

import com.arnan.userservice.entity.AuthUser;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface AuthUserRepository extends MongoRepository<AuthUser, String> {

	@Cacheable(value = "userByEmail", key = "#email")
    Optional<AuthUser> findByEmail(String email);
}