# ChatBot-Pro

ChatBot-Pro is a microservice-based chatbot platform with:
- `gateway` (Spring Cloud Gateway)
- `auth-service` (user APIs + OAuth2 token endpoint)
- `book_appointment`
- `chat`
- `eureka-server` (service discovery)

## Setup and Run Application Locally

### Prerequisites

Make sure the following tools are installed before running the application:

| Tool | Minimum version | Notes |
|---|---|---|
| Java (JDK) | 17 | `java -version` |
| Maven | 3.9 | `mvn -version` |
| Docker | 24 | `docker -v` |
| Docker Compose | 2.x | `docker compose version` |
| Git | any | `git --version` |

> **Optional:** MongoDB 6 and Redis 7 are only needed if you want to run services _without_ Docker.

---

### 1 — Clone the repository

```bash
git clone https://github.com/sanjeevndesai-gif/ChatBot-Pro.git
cd ChatBot-Pro
```

---

### 2 — Quick start (Docker Compose — recommended)

The easiest way to bring up the entire stack (all six microservices + MongoDB + Redis) in one command:

```bash
docker compose up --build
```

Docker Compose will:
1. Build each Spring Boot image from its local `Dockerfile`
2. Start MongoDB (`:27017`) and Redis (`:6379`)
3. Start Eureka Server (`:8761`)
4. Start Auth Service (`:8082`), Chat (`:9090`), Book Appointment (`:9091`), i18n (`:9092`)
5. Start the API Gateway (`:8080`)

Once all containers are healthy the gateway is available at **http://localhost:8080**.

To stop the stack:

```bash
docker compose down          # stop containers
docker compose down -v       # stop containers AND delete data volumes
```

---

### 3 — Run services individually (without Docker)

Use this approach when you want to develop or debug a specific service.

#### 3a — Start infrastructure

```bash
# MongoDB
docker run -d --name chatbot-mongo -p 27017:27017 mongo:6.0

# Redis
docker run -d --name chatbot-redis -p 6379:6379 redis:7
```

#### 3b — Start Eureka Server

```bash
cd eureka-server
./mvnw spring-boot:run
# Eureka dashboard → http://localhost:8761
```

#### 3c — Start Auth Service

```bash
cd auth-service
./mvnw spring-boot:run
# Runs on http://localhost:8082
```

#### 3d — Start API Gateway

```bash
cd gateway
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

#### 3e — Start remaining microservices (each in its own terminal)

```bash
cd chat             && ./mvnw spring-boot:run   # http://localhost:9090
cd book_appointment && ./mvnw spring-boot:run   # http://localhost:9091
cd i18n-service     && ./mvnw spring-boot:run   # http://localhost:9092
```

---

### 4 — Environment variables

All services have sensible defaults for local development. Override these when deploying to a shared or production environment:

| Variable | Default | Used by |
|---|---|---|
| `JWT_SECRET` | `ARNAN_AUTH_SERVICE_ULTRA_SECURE_SECRET_2026!!` | gateway, auth-service, chat, book_appointment, i18n-service |
| `SPRING_DATA_MONGODB_URI` | `mongodb://localhost:27017/<db>` | auth-service, chat, book_appointment, i18n-service |
| `SPRING_DATA_REDIS_HOST` | `localhost` | chat |
| `SPRING_DATA_REDIS_PORT` | `6379` | chat |
| `OAUTH2_CLIENT_ID` | `chatbot-client` | auth-service |
| `OAUTH2_CLIENT_SECRET` | `chatbot-secret` | auth-service |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://eureka-server:8761/eureka/` | all services |
| `WHATSAPP_TOKEN` | _(none)_ | chat — required for WhatsApp webhooks |
| `WHATSAPP_PHONE_ID` | _(none)_ | chat — required for WhatsApp webhooks |

Set them before running a service, e.g.:

```bash
export JWT_SECRET=my-strong-secret
export SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/auth-service
cd auth-service && ./mvnw spring-boot:run
```

---

### 5 — Verify the stack

Check that every service is healthy:

```bash
curl http://localhost:8761/actuator/health   # Eureka
curl http://localhost:8082/actuator/health   # Auth Service
curl http://localhost:9090/actuator/health   # Chat
curl http://localhost:9091/actuator/health   # Book Appointment
curl http://localhost:9092/actuator/health   # i18n Service
curl http://localhost:8080/actuator/health   # Gateway
```

Each endpoint should return `{"status":"UP"}`.

---

### 6 — Run the automated smoke test

The repository ships a convenience script that exercises every service end-to-end via the gateway:

```bash
# Start the full stack then run all checks
./scripts/smoke-test.sh --with-up

# Run against an already-running stack
./scripts/smoke-test.sh
```

---

## OAuth2 API authentication

All service APIs are protected with OAuth2 Bearer token validation.

Public endpoints:
- `POST /auth/oauth2/token`
- `POST /auth/auth-service` (register)
- `POST /auth/auth-service/login`
- actuator health endpoints

### Get an access token (client credentials)

```bash
curl -X POST http://localhost:8080/auth/oauth2/token \
	-H "Content-Type: application/x-www-form-urlencoded" \
	--data-urlencode "grant_type=client_credentials" \
	--data-urlencode "client_id=chatbot-client" \
	--data-urlencode "client_secret=chatbot-secret" \
	--data-urlencode "scope=api.read api.write"
```

### Call protected APIs

```bash
TOKEN="<access_token>"

curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/book/api/appointments
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/chat/api/qr/generate?phoneNumber=919999999999\&appointmentType=doctor\&userId=U001
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/auth/auth-service/findall
```

## Architecture Diagram

```
┌─────────────────────────────┐
│     WhatsApp Cloud API      │
│   (Meta Graph API v18.0)    │
└──────────────┬──────────────┘
               │ POST /api/whatsapp/webhook
               ▼
┌──────────────────────────────────────────────────────────────┐
│                    API Gateway  :8080                        │
│         Spring Cloud Gateway — JWT validation + routing      │
│                                                              │
│  /auth/**  →  auth-service                                   │
│  /chat/**  →  chat                                           │
│  /book/**  →  book_appointment                               │
│  /i18n/**  →  i18n-service                                   │
└───┬──────────────┬──────────────┬──────────────┬────────────┘
    │              │              │              │
    ▼              ▼              ▼              ▼
┌────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐
│  Auth  │  │   Chat    │  │  Book    │  │   i18n    │
│ Service│  │  Service  │  │Appoint-  │  │  Service  │
│ :8082  │  │  :9090    │  │  ment    │  │  :9092    │
│        │  │           │  │  :9091   │  │           │
│OAuth2  │  │Webhook    │  │Appoint-  │  │Labels     │
│Token   │  │ChatEngine │  │ments     │  │Translate  │
│User    │  │FlowResolver│ │Schedulers│  │Bulk Upsert│
│Mgmt    │  │ActionExec │  │Slots     │  │           │
│JWT Gen │  │QR Codes   │  │          │  │           │
└───┬────┘  └─────┬─────┘  └────┬─────┘  └─────┬─────┘
    │             │              │               │
    │        ┌────┴────┐         │               │
    │        │  Redis  │         │               │
    │        │  :6379  │         │               │
    │        │(sessions│         │               │
    │        │& flows) │         │               │
    │        └─────────┘         │               │
    │                            │               │
    └─────────────┬──────────────┘───────────────┘
                  │
    ┌─────────────▼──────────────┐
    │        MongoDB  :27017     │
    │                            │
    │  auth-service  (users)     │
    │  chatdb        (flows,     │
    │                 sessions)  │
    │  book_appointment          │
    │  i18n-service  (labels)    │
    └─────────────┬──────────────┘
                  │
    ┌─────────────▼──────────────┐
    │    Eureka Server  :8761    │
    │   (Service Discovery —     │
    │    all services register)  │
    └────────────────────────────┘
```

### Service Summary

| Service | Port | Description |
|---|---|---|
| `gateway` | 8080 | Spring Cloud Gateway — JWT validation & routing |
| `auth-service` | 8082 | OAuth2 token endpoint, user registration & login |
| `chat` | 9090 | WhatsApp webhook, flow engine, QR code generation |
| `book_appointment` | 9091 | Appointment & scheduler CRUD |
| `i18n-service` | 9092 | Internationalization labels & translations |
| `eureka-server` | 8761 | Netflix Eureka service discovery |
| `MongoDB` | 27017 | Persistent storage for all services |
| `Redis` | 6379 | Session state & flow document cache (Chat Service) |

## One-command smoke test

```bash
./scripts/smoke-test.sh --with-up
```
