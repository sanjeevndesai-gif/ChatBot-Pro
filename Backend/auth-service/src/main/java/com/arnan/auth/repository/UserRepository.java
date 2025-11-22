package com.arnan.auth.repository;
 
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.arnan.auth.model.User;
 
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);

    boolean existsByEmail(String email);
}

