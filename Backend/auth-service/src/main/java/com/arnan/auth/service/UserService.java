package com.arnan.auth.service;

import com.arnan.auth.model.User;
import com.arnan.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class UserService {

    @Autowired
    private UserRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public User register(User req) {

        if (repository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("Email already registered.");
        }

        req.setPassword(passwordEncoder.encode(req.getPassword()));
        req.setActive(true);
        req.setRole("USER");
        req.setCreatedDate(LocalDateTime.now());

        return repository.save(req);
    }
}
