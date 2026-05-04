package com.arnan.userservice.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@Document(collection = "auth_users")
public class AuthUser {

    @Id
    private String id;

    private String email;
    private String password;
    private String registrationId;
    
    private String role;
    private String status;
    private String plan;
    private Instant planExpiry;

    // ⭐ your dynamic JSON lives here
    private Map<String, Object> payload;

    private Instant createdAt;
}