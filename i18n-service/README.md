# i18n Service — Internationalisation Label Management

A Spring Boot microservice that stores and serves translated UI labels for all ChatBot-Pro front-ends. Labels are stored in MongoDB, protected by the same HMAC-SHA256 JWT used across the platform, and discoverable through Eureka / API Gateway.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Security](#security)
- [Running Locally](#running-locally)
- [Docker](#docker)
- [Environment Variables](#environment-variables)

---

## Overview

The **i18n Service** is the single source of truth for all client-facing text strings (labels) used by ChatBot-Pro UIs. It solves the problem of hard-coded strings scattered across front-end code by centralising every piece of translatable text in MongoDB and exposing them over a REST API.

Key capabilities:

- Full **CRUD** on individual labels.
- **Bulk upsert** — seed an entire locale in one request.
- **Translate endpoint** — returns a flat `key → value` map ready for direct front-end injection.
- **Namespace grouping** — fetch only the labels needed by one screen/component.
- Unique compound index on `(key, locale)` enforced at both the MongoDB and service layers.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.2.1 |
| Cloud | Spring Cloud 2023.0.0 |
| Database | MongoDB (Spring Data MongoDB) |
| Security | Spring Security + OAuth2 Resource Server (JWT / HMAC-SHA256) |
| Service Discovery | Netflix Eureka Client |
| Validation | Jakarta Bean Validation |
| Build | Maven (Maven Wrapper) |
| Utilities | Lombok, Jackson |

---

## Project Structure

```
i18n-service/
├── Dockerfile
├── pom.xml
└── src/
    ├── main/
    │   ├── java/com/arnan/i18n/
    │   │   ├── I18nServiceApplication.java      # Spring Boot entry point
    │   │   ├── configuration/
    │   │   │   └── SecurityConfig.java          # JWT decoder + security filter chain
    │   │   ├── controller/
    │   │   │   └── LabelController.java         # REST endpoints
    │   │   ├── exception/
    │   │   │   ├── GlobalExceptionHandler.java  # @RestControllerAdvice error handler
    │   │   │   └── NotFoundException.java       # 404 exception
    │   │   ├── repository/
    │   │   │   └── LabelRepository.java         # Generic MongoTemplate repository
    │   │   └── service/
    │   │       └── LabelService.java            # Generic map-based business logic
    │   └── resources/
    │       └── application.properties
    └── test/
        ├── java/com/arnan/i18n/
        │   └── I18nServiceApplicationTests.java
        └── resources/
            └── application-test.properties
```

---

## Data Model

### Label document (`labels` collection)

This service is intentionally generic: label records are handled as dynamic JSON documents (`Map<String, Object>`) instead of a fixed Java model class.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String | auto | MongoDB `_id` |
| `key` | String | ✓ | Dot-separated label key, e.g. `common.submit` |
| `locale` | String | ✓ | BCP-47 locale code (stored lowercase), e.g. `en`, `fr`, `hi` |
| `value` | String | ✓ | Translated text |
| `namespace` | String | | Logical grouping, e.g. `common`, `errors`, `dashboard` |
| `createdAt` | Instant | auto | Creation timestamp |
| `updatedAt` | Instant | auto | Last modification timestamp |

A **unique compound index** on `(key, locale)` is auto-created at startup.

### Example document

```json
{
  "_id": "64a1b2c3d4e5f60012345678",
  "key": "common.submit",
  "locale": "en",
  "value": "Submit",
  "namespace": "common",
  "createdAt": "2026-03-16T10:00:00Z",
  "updatedAt": "2026-03-16T10:00:00Z"
}
```

---

## API Endpoints

All endpoints (except `/actuator/**`) require a valid **JWT Bearer token**.

### Labels

| Method | Path | Description |
|---|---|---|
| `GET` | `/labels` | All labels |
| `GET` | `/labels/{id}` | Single label by `_id` |
| `GET` | `/labels/by-key?key=&locale=` | Label by key + locale |
| `GET` | `/labels/by-locale?locale=` | All labels for a locale |
| `GET` | `/labels/by-namespace?namespace=` | All labels in a namespace (all locales) |
| `GET` | `/labels/translate?namespace=&locale=` | Flat `key→value` map for UI |
| `POST` | `/labels` | Create a single label |
| `POST` | `/labels/bulk` | Bulk create / upsert |
| `PUT` | `/labels/{id}` | Full update of a label |
| `DELETE` | `/labels/{id}` | Delete a label |

### Via Gateway (prefix `/i18n`)

```
GET  http://gateway:8080/i18n/labels/translate?namespace=common&locale=en
POST http://gateway:8080/i18n/labels
```

### Example: translate endpoint

```
GET /labels/translate?namespace=errors&locale=fr
Authorization: Bearer <token>
```

Response:

```json
{
  "errors.required": "Ce champ est obligatoire",
  "errors.invalid_email": "Adresse e-mail invalide",
  "errors.not_found": "Ressource introuvable"
}
```

### Example: bulk upsert

```
POST /labels/bulk
Authorization: Bearer <token>
Content-Type: application/json

[
  { "key": "common.submit", "locale": "en", "value": "Submit",  "namespace": "common" },
  { "key": "common.cancel", "locale": "en", "value": "Cancel",  "namespace": "common" },
  { "key": "common.submit", "locale": "fr", "value": "Soumettre","namespace": "common" }
]
```

---

## Configuration

`src/main/resources/application.properties`:

```properties
spring.application.name=i18n-service
server.port=9092

spring.data.mongodb.uri=mongodb://localhost:27017/i18n-service
spring.data.mongodb.database=i18n-service
spring.data.mongodb.auto-index-creation=true

oauth2.jwt.secret=${JWT_SECRET:ARNAN_AUTH_SERVICE_ULTRA_SECURE_SECRET_2026!!}

eureka.client.service-url.defaultZone=http://eureka-server:8761/eureka/
```

---

## Security

- All endpoints except `/actuator/**` require a valid **JWT Bearer token**.
- JWTs are validated using **HMAC-SHA256** with the shared `JWT_SECRET` (same secret as all other services).
- Spring Security configured as a **stateless OAuth2 Resource Server**.
- CSRF is disabled (stateless API).

---

## Running Locally

### Prerequisites

- Java 17+
- Maven 3.9+
- MongoDB on `localhost:27017`
- Eureka Server (optional)

### Steps

```bash
cd i18n-service
./mvnw spring-boot:run
```

Service starts on **http://localhost:9092**.

```bash
curl http://localhost:9092/actuator/health
# {"status":"UP"}
```

---

## Docker

### Build

```bash
docker build -t i18n-service:latest .
```

### Run

```bash
docker run -d \
  --name chatbot-i18n \
  -p 9092:9092 \
  -e SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/i18n-service \
  -e JWT_SECRET=ARNAN_AUTH_SERVICE_ULTRA_SECURE_SECRET_2026!! \
  -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/ \
  i18n-service:latest
```

### Full Stack

```bash
docker compose up --build
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `9092` | HTTP port |
| `SPRING_DATA_MONGODB_URI` | `mongodb://localhost:27017/i18n-service` | MongoDB URI |
| `SPRING_DATA_MONGODB_DATABASE` | `i18n-service` | Database name |
| `JWT_SECRET` | _(see properties)_ | **Required.** HMAC-SHA256 JWT shared secret |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://eureka-server:8761/eureka/` | Eureka registry |
