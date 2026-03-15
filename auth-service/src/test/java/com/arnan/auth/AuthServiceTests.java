package com.arnan.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.HashMap;
import java.util.Map;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.arnan.auth.exception.NotFoundException;
import com.arnan.auth.repository.AuthRepository;
import com.arnan.auth.security.JwtUtil;
import com.arnan.auth.service.AuthService;
import com.arnan.auth.util.UserIdGenerator;

@ExtendWith(MockitoExtension.class)
class AuthServiceTests {

    @Mock
    AuthRepository authRepository;

    @Mock
    MongoTemplate mongoTemplate;

    @Mock
    BCryptPasswordEncoder passwordEncoder;

    @Mock
    JwtUtil jwtUtil;

    @Mock
    UserIdGenerator userIdGenerator;

    @InjectMocks
    AuthService authService;

    @Test
    void contextLoads() {
        assertNotNull(authService);
    }

    @Test
    void loginWithInvalidUserShouldThrowException() {

        when(authRepository.findByEmail(anyString()))
                .thenReturn(null);

        Map<String, Object> body = Map.of(
                "email", "invalid@test.com",
                "password", "invalid"
        );

        assertThrows(NotFoundException.class, () -> authService.login(body));
    }

    @Test
    void saveShouldEncryptPassword() {

        when(passwordEncoder.encode(any()))
                .thenReturn("$2a$hashedPassword");

        when(userIdGenerator.generate(anyString()))
                .thenReturn("USR101");

        Document fakeSaved = new Document();
        fakeSaved.put("name", "test");
        fakeSaved.put("password", "$2a$hashedPassword");

        when(authRepository.findByName("test", "ORG1"))
                .thenReturn(fakeSaved);

        Map<String, Object> body = new HashMap<>();
        body.put("userId", "USR100");
        body.put("name", "test");
        body.put("orgId", "ORG1");
        body.put("email", "secure@test.com");
        body.put("password", "Test@123");

        authService.save(body);

        Document saved = authService.findByName("test", "ORG1");

        assertNotNull(saved);
        assertNotEquals("Test@123", saved.getString("password"));
    }
}
