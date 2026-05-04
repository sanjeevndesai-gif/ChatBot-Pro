package com.arnan.userservice.repository;

import com.arnan.userservice.entity.AppUser;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<AppUser, String> {

    List<AppUser> findByRegistrationId(String registrationId);

    Optional<AppUser> findByIdAndRegistrationId(String id, String registrationId);
}