# ChatBot-Pro

ChatBot-Pro is a full-stack, multi-tenant WhatsApp appointment booking and clinic management platform built with:
- **Backend** — 6 Spring Boot microservices (Java 17, Spring Cloud)
- **Frontend** — Angular 20 single-page application
- **WhatsApp** — 4 configurable conversation flows driven by QR codes

---

## Architecture

```
                          ┌──────────────────────────────────────────────┐
                          │             Angular 20 SPA                   │
                          │         http://localhost:4200                 │
                          │  Login · Profile · Appointments · Reports     │
                          │  Schedule · Billing · i18n · User Mgmt        │
                          └──────────────────┬───────────────────────────┘
                                             │ REST / JWT
                          ┌──────────────────▼───────────────────────────┐
                          │          API Gateway  :8080                   │
                          │   JWT validation · CORS · Route forwarding    │
                          └──┬──────────┬──────────┬──────────┬──────────┘
                             │          │          │          │
               ┌─────────────▼──┐  ┌───▼────┐  ┌─▼──────┐  ┌▼───────────┐
               │  auth-service  │  │  chat  │  │  book  │  │ i18n-svc   │
               │    :8082       │  │  :9090 │  │ :9091  │  │  :9092     │
               │ Users · JWT    │  │(below) │  │Appts · │  │ Labels ·   │
               │ Billing · Plans│  │        │  │Sched.  │  │ Locale     │
               └────────────────┘  └───┬────┘  └────────┘  └────────────┘
                                       │
              ┌────────────────────────┴───────────────────────────┐
              │              Chat Service  :9090                    │
              │                                                     │
              │   WhatsApp Cloud API ──► WebhookController          │
              │                              │                      │
              │                         ChatEngine                  │
              │                  (session in MongoDB)               │
              │                              │                      │
              │                        FlowResolver                 │
              │                  (flow docs cached in Redis)        │
              │                    ┌─────────┤                      │
              │                    │         │                      │
              │            ActionExecutor  ConditionEvaluator       │
              │            ValidationEngine                         │
              │                    │                                │
              │             ExternalApiService                      │
              │          (WebClient to downstream services)         │
              │                    │                                │
              │          ┌─────────┴──────────┐                    │
              │          ▼                     ▼                    │
              │    auth-service           book_appointment          │
              │  /auth-service/find       /api/appointments         │
              │  /auth-service/clinics    /api/schedulers           │
              └─────────────────────────────────────────────────────┘

              ┌─────────────────────────────────────────────────────┐
              │              Eureka Server  :8761                   │
              │          Service Registry — all services register   │
              └─────────────────────────────────────────────────────┘
```

---

## WhatsApp Conversation Flows

All 4 flows start by scanning a **QR code** that encodes the flow type and clinic/doctor ID.
Each flow is stored as a document in MongoDB `flows` collection and can be modified at any time
**without redeployment**.

```
Patient / Doctor scans QR code
         │
         │  WhatsApp sends QR payload → Webhook
         │
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  QR type=appointment  ──►  APPOINTMENT_FLOW              │
  │  QR type=support      ──►  SUPPORT_FLOW                  │
  │  QR type=doctor_help  ──►  DOCTOR_HELP_FLOW              │
  │  QR type=clinic       ──►  CLINIC_FINDER_FLOW            │
  │  QR type=doctor       ──►  DOCTOR_FLOW  (legacy)         │
  │  plain "hi"           ──►  MAIN_MENU_FLOW                │
  └──────────────────────────────────────────────────────────┘
```

### Flow 1 — APPOINTMENT_FLOW
Patient scans appointment QR → enters Doctor ID → selects date → selects time slot → appointment booked.

```
[QR Scan] → ASK_DOCTOR_ID → FETCH_DOCTOR_PROFILE → ASK_DATE
         → FETCH_SLOTS → SELECT_SLOT → BOOK_APPOINTMENT → BOOKING_DONE ✅
```

### Flow 2 — SUPPORT_FLOW
Patient scans support QR → picks issue category → describes problem → ticket saved to MongoDB.

```
[QR Scan] → SUPPORT_MENU → DESCRIBE_ISSUE → CREATE_TICKET → TICKET_DONE ✅
                (1=Technical / 2=Billing / 3=General)
```

### Flow 3 — DOCTOR_HELP_FLOW
Doctor scans their own help QR → sets schedule availability OR views appointment report.

```
[QR Scan] → DOCTOR_MENU ──► 1 ──► SET_SCHEDULE_DATE → SET_SCHEDULE_START
                        │            → SET_SCHEDULE_END → SAVE_SCHEDULE ✅
                        └──► 2 ──► REPORT_ASK_DATE → FETCH_REPORT → SHOW_REPORT ✅
```

### Flow 4 — CLINIC_FINDER_FLOW
Patient scans clinic-finder QR → enters city → sees clinics near them → picks a slot → appointment booked.

```
[QR Scan] → ASK_CITY → FETCH_CLINICS → SHOW_CLINICS
         → SELECT_DOCTOR_DATE → FETCH_CLINIC_SLOTS → SELECT_CLINIC_SLOT
         → BOOK_CLINIC_APPOINTMENT → CLINIC_BOOKING_DONE ✅
```

---

## Services

| Service | Port | Package | Role |
|---|---|---|---|
| `eureka-server` | 8761 | `com.arnan.eureka` | Service registry |
| `gateway` | 8080 | `com.arnan.gateway` | API Gateway, JWT validation, CORS |
| `auth-service` | 8082 | `com.arnan.auth` | JWT auth, users, billing, clinic lookup |
| `book_appointment` | 9091 | `com.arnan.book_appointment` | Appointments & scheduler CRUD |
| `chat` | 9090 | `com.arnan.chat` | WhatsApp webhook, configurable chat engine |
| `i18n-service` | 9092 | `com.arnan.i18n` | Multilingual label management |

---

## MongoDB Collections

| Collection | Service | Purpose |
|---|---|---|
| `users` | auth-service | User accounts, billing, profile photos |
| `appointments` | book_appointment | Booked appointments |
| `schedulers` | book_appointment | Doctor schedule / slot definitions |
| `conversations` | chat | Active WhatsApp chat sessions |
| `flows` | chat | Conversation flow definitions (editable) |
| `messages` | chat | Message template strings |
| `support_tickets` | chat | Support tickets created via SUPPORT_FLOW |
| `labels` | i18n-service | i18n label keys and translations |

---

## Project Structure

```
ChatBot-Pro/
├── backend/
│   ├── auth-service/        :8082  Users, JWT, Billing
│   ├── book_appointment/    :9091  Appointments, Schedulers
│   ├── chat/                :9090  WhatsApp flows engine
│   ├── eureka-server/       :8761  Service Registry
│   ├── gateway/             :8080  API Gateway + JWT
│   ├── i18n-service/        :9092  Labels / i18n
│   ├── db-seeds/                   MongoDB seed data for testing
│   │   ├── flows.json              All 5 conversation flow documents
│   │   ├── messages.json           Message template strings
│   │   ├── test_appointments.json  Sample appointments
│   │   ├── test_schedulers.json    Sample doctor schedules
│   │   └── test_support_tickets.json  Sample support tickets
│   ├── build-all.ps1
│   └── run-all-services.ps1
└── frontend/
    └── chat_bot/            :4200  Angular 20 SPA
```

---

## Setup and Run Application Locally

### Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Java (JDK) | 17 | `java -version` |
| Maven | 3.9 | `mvn -version` |
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Angular CLI | 20 | `npm install -g @angular/cli` |
| Docker | 24 | `docker -v` *(optional — for infra only)* |
| Git | any | `git --version` |

> MongoDB 6 and Redis 7 must be running locally (or via Docker) before starting backend services.

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

### 3 — Run backend services locally (without Docker)

#### 3a — Start infrastructure

```bash
# MongoDB
docker run -d --name chatbot-mongo -p 27017:27017 mongo:6.0

# Redis (required by chat service)
docker run -d --name chatbot-redis -p 6379:6379 redis:7
```

#### 3b — Build all services

```powershell
cd backend
.\build-all.ps1
```

#### 3c — Start all services at once (Windows)

```powershell
cd backend
.\run-all-services.ps1
```

This script starts Eureka first, waits for it to be ready, then launches all remaining services — each in its own PowerShell window.

#### 3d — Or start services individually (in order)

```bash
# 1. Eureka Server (start first)
cd backend/eureka-server
mvn spring-boot:run
# Eureka dashboard → http://localhost:8761

# 2. Auth Service
cd backend/auth-service
./mvnw spring-boot:run
# http://localhost:8082

# 3. API Gateway
cd backend/gateway
mvn spring-boot:run
# http://localhost:8080

# 4. Remaining services (each in a separate terminal)
cd backend/book_appointment && ./mvnw spring-boot:run   # :9091
cd backend/chat             && ./mvnw spring-boot:run   # :9090
cd backend/i18n-service     && mvn spring-boot:run      # :9092
```

---

### 4 — Import MongoDB test data

After starting the stack, import the seed data to enable all flow testing:

```bash
# flows — conversation flow documents
mongoimport --db chatdb --collection flows --file backend/db-seeds/flows.json --jsonArray

# message templates
mongoimport --db chatdb --collection messages --file backend/db-seeds/messages.json --jsonArray

# sample appointments
mongoimport --db chatdb --collection appointments --file backend/db-seeds/test_appointments.json --jsonArray

# sample doctor schedules
mongoimport --db chatdb --collection schedulers --file backend/db-seeds/test_schedulers.json --jsonArray

# sample support tickets
mongoimport --db chatdb --collection support_tickets --file backend/db-seeds/test_support_tickets.json --jsonArray
```

> **Note:** `FlowSeedService` auto-seeds the `flows` collection on chat service startup if documents are missing, so the `flows.json` import is only needed for a fresh manual import.

---

### 5 — Run the Angular frontend locally

```bash
cd frontend/chat_bot

# Install dependencies (first time only)
npm install --legacy-peer-deps

# Start dev server
npm start
# App available at → http://localhost:4200
```

#### Build for production

```bash
cd frontend/chat_bot
npm run build
# Output → frontend/chat_bot/dist/chatbot/
```

---

### 6 — Environment variables and profiles

#### Active profiles

All services support three Spring profiles:

| Profile | How to activate | Database target |
|---|---|---|
| *(default)* | `./mvnw spring-boot:run` | `localhost` MongoDB + Redis |
| `dev` | `SPRING_PROFILES_ACTIVE=dev` | Dev-cluster MongoDB + Redis |
| `prod` | `SPRING_PROFILES_ACTIVE=prod` | Prod-cluster MongoDB + Redis |

#### Running for dev / prod (Docker Compose)

```bash
# Dev stack
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Prod stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

---

### 7 — WhatsApp QR code format

Generate a QR code that encodes one of the following strings and send it to the WhatsApp number configured via `WHATSAPP_PHONE_ID`:

| Flow | QR payload string | Flow started |
|---|---|---|
| Book Appointment | `REF:<base64("appointment:DOCTOR_USER_ID")>` | APPOINTMENT_FLOW |
| Application Support | `REF:<base64("support:DOCTOR_USER_ID")>` | SUPPORT_FLOW |
| Doctor Help | `REF:<base64("doctor_help:DOCTOR_USER_ID")>` | DOCTOR_HELP_FLOW |
| Clinic Finder | `REF:<base64("clinic:DOCTOR_USER_ID")>` | CLINIC_FINDER_FLOW |

Example (Node.js):
```js
const token = Buffer.from('appointment:doc001').toString('base64url');
// QR encodes: REF:<token>
```


## Setup and Run Application Locally

### Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Java (JDK) | 17 | `java -version` |
| Maven | 3.9 | `mvn -version` |
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Angular CLI | 20 | `npm install -g @angular/cli` |
| Docker | 24 | `docker -v` *(optional — for infra only)* |
| Git | any | `git --version` |

> MongoDB 6 and Redis 7 must be running locally (or via Docker) before starting backend services.

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

### 3 — Run backend services locally (without Docker)

#### 3a — Start infrastructure

```bash
# MongoDB
docker run -d --name chatbot-mongo -p 27017:27017 mongo:6.0

# Redis (required by chat service)
docker run -d --name chatbot-redis -p 6379:6379 redis:7
```

#### 3b — Build all services

```powershell
cd backend
.\build-all.ps1
```

#### 3c — Start all services at once (Windows)

```powershell
cd backend
.\run-all-services.ps1
```

This script starts Eureka first, waits for it to be ready, then launches all remaining services — each in its own PowerShell window.

#### 3d — Or start services individually (in order)

```bash
# 1. Eureka Server (start first)
cd backend/eureka-server
mvn spring-boot:run
# Eureka dashboard → http://localhost:8761

# 2. Auth Service
cd backend/auth-service
./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-DEUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://localhost:8761/eureka/"
# http://localhost:8082

# 3. API Gateway
cd backend/gateway
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-DEUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://localhost:8761/eureka/"
# http://localhost:8080

# 4. Remaining services (each in a separate terminal)
cd backend/book_appointment && ./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-DEUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://localhost:8761/eureka/"  # :9091
cd backend/chat             && ./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="-DEUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://localhost:8761/eureka/"  # :9090
cd backend/i18n-service     && mvn spring-boot:run -Dspring-boot.run.jvmArguments="-DEUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=http://localhost:8761/eureka/"     # :9092
```

---

### 4 — Run the Angular frontend locally

```bash
cd frontend/chat_bot

# Install dependencies (first time only)
npm install --legacy-peer-deps

# Start dev server
npm start
# App available at → http://localhost:4200
```

#### Build for production

```bash
cd frontend/chat_bot
npm run build
# Output → frontend/chat_bot/dist/chatbot/
```

---

### 5 — Environment variables and profiles

#### Active profiles

All services support three Spring profiles. The profile controls which database the service connects to:

| Profile | How to activate | Database target |
|---|---|---|
| *(default — no profile)* | `./mvnw spring-boot:run` — no env var needed | `localhost` MongoDB + Redis |
| `dev` | `SPRING_PROFILES_ACTIVE=dev` | Dev-cluster MongoDB + Redis |
| `prod` | `SPRING_PROFILES_ACTIVE=prod` | Prod-cluster MongoDB + Redis |

Spring Boot automatically loads `application.properties` (shared config) and then merges the profile-specific file on top (`application-dev.properties` or `application-prod.properties`), so profile files only need to contain the overrides.

#### Running locally (no profile needed)

No environment variables are required. Every service defaults to `localhost:27017` (MongoDB) and `localhost:6379` (Redis):

```bash
cd auth-service && ./mvnw spring-boot:run   # connects to mongodb://localhost:27017/auth-service
cd chat         && ./mvnw spring-boot:run   # connects to localhost Redis + MongoDB
```

#### Running for dev / prod (individual service)

```bash
export SPRING_PROFILES_ACTIVE=dev
export SPRING_DATA_MONGODB_URI=mongodb+srv://user:pass@dev-cluster.mongodb.net/auth-service
cd auth-service && ./mvnw spring-boot:run
```

#### Running the full stack for dev / prod (Docker Compose)

1. Copy the template and fill in real values:

   ```bash
   cp .env.example .env
   # Edit .env with your real dev/prod MongoDB Atlas and Redis URIs
   ```

2. Bring up the stack with the correct override file:

   ```bash
   # Dev stack
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

   # Prod stack
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up
   ```

> **`.env` is listed in `.gitignore` and must never be committed to source control.**  
> Use `.env.example` as the reference template for what variables are needed.

#### All configurable environment variables

| Variable | Default (local) | Used by |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | _(unset = local)_ | all services |
| `JWT_SECRET` | `ARNAN_AUTH_SERVICE_ULTRA_SECURE_SECRET_2026!!` | gateway, auth-service, chat, book_appointment, i18n-service |
| `SPRING_DATA_MONGODB_URI` | `mongodb://localhost:27017/<db>` | auth-service, chat, book_appointment, i18n-service |
| `SPRING_DATA_REDIS_HOST` | `localhost` | chat |
| `SPRING_DATA_REDIS_PORT` | `6379` | chat |
| `SPRING_DATA_REDIS_PASSWORD` | _(empty)_ | chat |
| `OAUTH2_CLIENT_ID` | `chatbot-client` | auth-service |
| `OAUTH2_CLIENT_SECRET` | `chatbot-secret` | auth-service |
| `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` | `http://eureka-server:8761/eureka/` | all services |
| `WHATSAPP_TOKEN` | _(none)_ | chat — required for WhatsApp webhooks |
| `WHATSAPP_PHONE_ID` | _(none)_ | chat — required for WhatsApp webhooks |

---

### 6 — Verify the stack

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

### 7 — Run the automated smoke test

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
