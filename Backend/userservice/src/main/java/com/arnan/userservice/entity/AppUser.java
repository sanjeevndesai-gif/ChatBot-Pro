package com.arnan.userservice.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data
@Document(collection = "app_users")
public class AppUser {

    @Id
    private String id;

    private String registrationId;
    private String createdBy;

    private Map<String, Object> payload;

    private Instant createdAt;
    private Instant updatedAt;
}