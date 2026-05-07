# Chat Service — Generic WhatsApp Appointment Engine

A Spring Boot microservice that drives end-to-end conversational appointment booking over **WhatsApp Cloud API**. It maintains per-user chat sessions, resolves configurable conversation flows stored in MongoDB, and communicates with downstream microservices (doctor-service, slot-service) to complete bookings.

---

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Flow Engine](#flow-engine)
- [Data Storage](#data-storage)
- [Security](#security)
- [Running Locally](#running-locally)
- [Docker](#docker)
- [Environment Variables](#environment-variables)

---

## Overview

The **Chat Service** acts as the WhatsApp-facing brain of the ChatBot-Pro platform. It:

1. Receives incoming messages from **WhatsApp Cloud API** via a webhook.
2. Uses a **flow-based chat engine** (flows persisted in MongoDB) to drive multi-step conversations.
3. Calls external services (slots, doctors) using REST templates and WebClient.
4. Generates **QR codes** that deep-link users directly into WhatsApp appointment flows.
5. Registers itself with **Eureka** and is reachable through the **API Gateway**.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.4.4 |
| Cloud | Spring Cloud 2023.0.0 |
| REST / Messaging | Spring Web MVC + Spring WebFlux (WebClient) |
| Database | MongoDB (Spring Data MongoDB + MongoTemplate) |
| Caching | Redis (Spring Data Redis / Lettuce) |
| Security | Spring Security + OAuth2 Resource Server (JWT / HMAC-SHA256) |
| Service Discovery | Netflix Eureka Client |
| QR Code | Google ZXing 3.5.1 |
| Build | Maven (Maven Wrapper) |
| Utilities | Lombok, Jackson |

---

## Architecture

```
WhatsApp Cloud API
        │  POST /api/whatsapp/webhook
        ▼
┌──────────────────────────────────────────────────┐
│               API Gateway (:8080)                │
│        (JWT validation + routing)                │
└─────────────────────┬────────────────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │     Chat Service (:9090)   │
        │                            │
        │  WhatsAppWebhookController │
        │         │                  │
        │    ChatEngine              │
        │         │                  │
        │    FlowResolver ──► MongoDB│
        │    (cached via Redis)      │
        │         │                  │
        │    ActionExecutor          │
        │         │                  │
        │  ExternalApiService ───────┼──► doctor-service
        │  WhatsAppSender ───────────┼──► slot-service
        │                            │
        └────────────────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │     Eureka Server (:8761)  │
        └────────────────────────────┘
```

---

## Project Structure

```
chat/
├── Dockerfile
├── pom.xml
└── src/
    └── main/
        ├── java/com/arnan/chat/
        │   ├── ChatApplication.java            # Spring Boot entry point
        │   ├── config/                         # All configuration classes
        │   │   ├── HttpClientConfig.java       # RestTemplate bean
        │   │   ├── MongoConfig.java            # MongoDB transaction manager
        │   │   ├── RedisConfig.java            # RedisTemplate bean
        │   │   ├── WebClientConfig.java        # WebClient bean
        │   │   ├── ChatProperties.java         # Bound from application.properties
        │   │   └── SecurityConfig.java         # JWT security filter chain
        │   ├── Controller/
        │   │   ├── WhatsAppWebhookController.java  # Webhook entry point
        │   │   └── QrController.java               # QR code generator
        │   ├── engine/
        │   │   ├── ChatEngine.java             # Conversation orchestrator
        │   │   ├── FlowResolver.java           # MongoDB flow lookup + caching
        │   │   ├── ActionExecutor.java         # Executes REST actions in flows
        │   │   ├── ConditionEvaluator.java     # Evaluates conditional branches
        │   │   └── ValidationEngine.java       # Input validation rules
        │   └── whatsapp/
        │       ├── WhatsAppSender.java         # Sends messages via Cloud API
        │       └── ExternalApiService.java     # Calls doctor/slot microservices
        └── resources/
            └── application.properties
```

---

## Key Features

### Webhook Listener
- **`POST /api/whatsapp/webhook`** — Receives real-time messages from Meta's WhatsApp Cloud API.
- Ignores delivery receipts and read events; processes only user text messages.
- Parses QR deep-link parameters (`type`, `userId`) embedded in the incoming text to determine the correct conversation flow.

### Flow-Based Chat Engine
- Conversation flows (e.g., `DOCTOR_FLOW`) are stored as documents in the `flows` MongoDB collection.
- Each flow consists of ordered **steps**, each of which can include:
  - **Prompt** — message sent to the user.
  - **Validation** — rules applied to the user's reply (e.g., required, regex, enum).
  - **Conditions** — branch to a different step based on the reply value.
  - **Action** — execute an external REST call and store the result in context.
- Session state is persisted in the `conversations` MongoDB collection.
- Session timeout is configurable (`chat.session.timeout-seconds`, default `900`s).

### QR Code Generation
- **`GET /api/qr/generate`** — Generates a 300×300 PNG QR code.
- The QR encodes a WhatsApp deep link: `https://wa.me/<phone>?text=Hi&type=<type>&userId=<id>`.
- Scanning the QR opens WhatsApp and automatically starts the correct appointment flow.

### Caching
- `FlowResolver` uses `@Cacheable` (Redis) to cache resolved flow documents, reducing MongoDB round-trips during active conversations.

### Service Discovery
- Registers with **Eureka** at startup; downstream service URLs (`doctor-service`, `slot-service`) are resolved by service name via the API Gateway / Ribbon.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/whatsapp/webhook` | Public | WhatsApp webhook verification (hub challenge) |
| `POST` | `/api/whatsapp/webhook` | JWT | Receives incoming WhatsApp messages |
| `GET` | `/api/qr/generate` | JWT | Generates a QR code PNG |
| `GET` | `/actuator/**` | Public | Spring Boot Actuator health/info endpoints |

### QR Generate — Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `phoneNumber` | String | WhatsApp Business phone number (without `+`) |
| `appointmentType` | String | Type of appointment (e.g. `doctor`) |
| `userId` | String | Application user ID embedded in the QR |

### Example QR Request

```
GET /api/qr/generate?phoneNumber=919876543210&appointmentType=doctor&userId=usr_001
```

**Response:** `image/png` — 300×300 QR code image.

---

## Configuration

All configuration lives in `src/main/resources/application.properties`.

```properties
# Application
spring.application.name=chat
server.port=9090

# MongoDB
spring.data.mongodb.uri=mongodb://localhost:27017/chatdb
spring.data.mongodb.database=chatdb

# WhatsApp Cloud API
chat.whatsapp.token=<META_WHATSAPP_TOKEN>
chat.whatsapp.phone-id=<META_PHONE_NUMBER_ID>
chat.whatsapp.graph-url=https://graph.facebook.com/v18.0
chat.session.timeout-seconds=900

# Redis
spring.data.redis.host=localhost
spring.data.redis.port=6379

# External services
chat.external.doctor-service-url=http://doctor-service
chat.external.slot-service-url=http://slot-service

# Eureka
eureka.client.service-url.defaultZone=http://eureka-server:8761/eureka/

# JWT secret (must match auth-service)
oauth2.jwt.secret=<JWT_SECRET>
```

---

## Flow Engine

Conversation flows are stored in MongoDB as documents inside the `flows` collection and resolved by `flowId`. A typical flow document looks like:

```json
{
  "_id": "DOCTOR_FLOW",
  "steps": [
    {
      "id": "START",
      "message": "👋 Welcome! Please enter your full name:",
      "saveAs": "patientName",
      "validation": { "type": "REQUIRED" },
      "next": "ASK_DATE"
    },
    {
      "id": "ASK_DATE",
      "message": "📅 Enter your preferred appointment date (DD-MM-YYYY):",
      "saveAs": "appointmentDate",
      "validation": { "type": "DATE", "format": "dd-MM-yyyy" },
      "action": {
        "type": "REST",
        "url": "http://slot-service/api/slots/available?date={appointmentDate}",
        "saveAs": "availableSlots"
      },
      "next": "CONFIRM"
    },
    {
      "id": "CONFIRM",
      "message": "✅ Appointment booked for {appointmentDate}. Reply *YES* to confirm.",
      "saveAs": "confirmation",
      "conditions": [
        { "if": "YES", "goto": "DONE" },
        { "else": true, "goto": "ASK_DATE" }
      ],
      "next": "DONE"
    },
    {
      "id": "DONE",
      "message": "🎉 Your appointment has been confirmed!",
      "end": true
    }
  ]
}
```

### Flow Lifecycle

```
User sends "Hi"
      │
      ▼
ChatEngine creates conversation document in MongoDB
      │
      ▼
FlowResolver fetches flow by flowId (cached in Redis)
      │
      ▼
Execute current step:
  1. Validate user input
  2. Run action (optional REST call)
  3. Evaluate conditions → determine next step
  4. Send prompt via WhatsAppSender
      │
      ▼
Save updated conversation state to MongoDB
      │
      ▼
Repeat until step has "end: true"  →  mark conversation ended
```

---

## Data Storage

### MongoDB — `chatdb`

| Collection | Purpose |
|---|---|
| `conversations` | Active/completed chat sessions per user |
| `flows` | Flow definition documents (indexed by `_id`) |

**Conversation document structure:**

```json
{
  "_id": "<session-uuid>",
  "userId": "<app-user-id>",
  "flowId": "DOCTOR_FLOW",
  "currentStep": "ASK_DATE",
  "ended": false,
  "context": {
    "patientName": "John Doe",
    "appointment_type": "doctor"
  },
  "lastMessageAt": "2026-03-16T10:00:00Z"
}
```

### Redis

Used exclusively as a **cache layer** for flow documents. Cache entries are populated on first flow resolution (`@Cacheable`) and stay valid for the duration of the cache TTL configured in `RedisConfig`.

---

## Security

- All endpoints except `/actuator/**` and the webhook `GET` verification require a valid **JWT Bearer token**.
- JWTs are validated using **HMAC-SHA256** with a shared secret (`oauth2.jwt.secret`) — this secret must be identical to the one used by `auth-service` to issue tokens.
- Spring Security is configured as a **stateless OAuth2 Resource Server** (no server-side HTTP session).
- CSRF protection is disabled (stateless API).
- CORS preflight (`OPTIONS`) requests are permitted without authentication.

---

## Running Locally

### Prerequisites

- Java 17+
- Maven 3.9+
- MongoDB running on `localhost:27017`
- Redis running on `localhost:6379`
- Eureka Server (optional for local testing)

### Steps

```bash
# 1. Clone the repository and navigate to the service
cd chat

# 2. Set required environment variables (or update application.properties)
export WHATSAPP_TOKEN=your_meta_token
export WHATSAPP_PHONE_ID=your_phone_id
export JWT_SECRET=your_jwt_secret

# 3. Build and run
./mvnw spring-boot:run
```

The service starts on **http://localhost:9090**.

### Verify

```bash
curl http://localhost:9090/actuator/health
# {"status":"UP"}
```

---

## Docker

### Build Image

```bash
docker build -t chat-service:latest .
```

### Run Container

```bash
docker run -d \
  --name chat-service \
  -p 9090:9090 \
  -e SPRING_DATA_MONGODB_URI=mongodb://mongo:27017/chatdb \
  -e SPRING_DATA_REDIS_HOST=redis \
  -e CHAT_WHATSAPP_TOKEN=your_token \
  -e CHAT_WHATSAPP_PHONE_ID=your_phone_id \
  -e OAUTH2_JWT_SECRET=your_jwt_secret \
  -e EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://eureka-server:8761/eureka/ \
  chat-service:latest
```

### Docker Compose (full stack)

From the project root:

```bash
docker compose up --build
```

This starts all services: Eureka, Gateway, Auth, Chat, Book-Appointment, MongoDB, and Redis together.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `9090` | HTTP port |
| `SPRING_DATA_MONGODB_URI` | `mongodb://localhost:27017/chatdb` | MongoDB connection URI |
| `SPRING_DATA_MONGODB_DATABASE` | `chatdb` | MongoDB database name |
| `SPRING_DATA_REDIS_HOST` | `localhost` | Redis host |
| `SPRING_DATA_REDIS_PORT` | `6379` | Redis port |
| `SPRING_DATA_REDIS_PASSWORD` | _(empty)_ | Redis password |
| `CHAT_WHATSAPP_TOKEN` | — | **Required.** Meta WhatsApp Cloud API access token |
| `CHAT_WHATSAPP_PHONE_ID` | — | **Required.** WhatsApp Business phone number ID |
| `CHAT_WHATSAPP_GRAPH_URL` | `https://graph.facebook.com/v18.0` | Meta Graph API base URL |
| `CHAT_SESSION_TIMEOUT_SECONDS` | `900` | Inactivity timeout per user session (seconds) |
| `OAUTH2_JWT_SECRET` | — | **Required.** HMAC-SHA256 shared secret for JWT validation |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://eureka-server:8761/eureka/` | Eureka registry URL |
| `CHAT_EXTERNAL_DOCTOR_SERVICE_URL` | `http://doctor-service` | Doctor service base URL |
| `CHAT_EXTERNAL_SLOT_SERVICE_URL` | `http://slot-service` | Slot service base URL |

---

> **Note:** Never commit real values for `CHAT_WHATSAPP_TOKEN`, `OAUTH2_JWT_SECRET`, or any other secrets to version control. Use environment variables or a secrets manager in production.
