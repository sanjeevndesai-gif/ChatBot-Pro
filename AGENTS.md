# ChatBot-Pro — AI Agent Instructions

A multi-tenant WhatsApp appointment booking platform.  
**Full coding standards and output format**: [.github/agents/chatbot-pro-dev.agent.md](.github/agents/chatbot-pro-dev.agent.md)

## Architecture at a Glance

| Service | Port | Package | Role |
|---|---|---|---|
| `eureka-server` | 8761 | `com.arnan.eureka` | Service registry |
| `gateway` | 8080 | `com.arnan.gateway` | API Gateway, JWT validation, CORS |
| `auth-service` | 8082 | `com.arnan.auth` | JWT auth, users, billing |
| `book_appointment` | 9091 | `com.arnan.book_appointment` | Appointment & scheduler CRUD |
| `chat` | 9090 | `com.arnan.chat` | WhatsApp webhook, chat engine |
| `i18n-service` | 9092 | `com.arnan.i18n` | Multilingual label management |

**Frontend:** Angular 20 SPA at `frontend/chat_bot/` — standalone components, lazy-loaded routes, Reactive Forms, Angular Material.

All traffic routes through the gateway. CORS is handled exclusively at the gateway — never add `@CrossOrigin` to service controllers.

## Quick-Start Commands

```powershell
# Full stack (recommended)
cd backend ; docker compose up --build
cd backend ; docker compose down -v      # teardown + volumes

# Build one service
cd backend/<service> ; ./mvnw clean package -DskipTests

# Build all services
cd backend ; .\build-all.ps1

# Run all locally (no Docker)
cd backend ; .\run-all-services.ps1

# Frontend dev server (http://localhost:4200)
cd frontend/chat_bot ; npm start

# Frontend production build → dist/chatbot/
cd frontend/chat_bot ; npm run build

# Frontend tests (Karma + Jasmine)
cd frontend/chat_bot ; npm test
```

## Critical Rules

1. **Multi-tenancy** — every DB read/write must filter by both `userId` and `appId`. Never leak data across tenants.
2. **MongoDB patterns** — each service has a fixed data-access pattern; never mix them within a service:
   - `book_appointment` → raw `MongoClient` / `MongoCollection<Document>`
   - `auth-service` → `MongoTemplate` + raw `org.bson.Document`
   - `chat` → `MongoTemplate`
   - `i18n-service` → `MongoRepository`
3. **Secrets** — all credentials/tokens via env vars using `${ENV_VAR}` syntax with **no literal defaults**. `JWT_SECRET` must not have a fallback.
4. **gateway `application.yml`** — never duplicate root-level YAML keys (causes `DuplicateKeyException` startup crash).
5. **Dependency discipline** — never add a Maven/npm dependency not already present in the service's `pom.xml` / `package.json`.
6. **No code without reading first** — always read at least one analogous existing file before generating new code.

## Key Files

| Purpose | Path |
|---|---|
| Gateway routing config | [backend/gateway/src/main/resources/application.yml](backend/gateway/src/main/resources/application.yml) |
| Frontend API base URLs | [frontend/chat_bot/src/environments/environment.ts](frontend/chat_bot/src/environments/environment.ts) |
| Angular routes | `frontend/chat_bot/src/app/app.routes.ts` |
| Docker Compose (local) | [backend/docker-compose.yml](backend/docker-compose.yml) |
| CI/CD pipeline | [.github/workflows/build-push-ecr.yml](.github/workflows/build-push-ecr.yml) |

## Known Pitfalls

- **Gateway crash on deploy**: duplicate `oauth2` root key in `gateway/application.yml` → `DuplicateKeyException`. Keep a single `oauth2.jwt.secret` block.
- **Chat session start**: only the exact lowercase message `"hi"` starts a session. `"Hi"`, `"HI"`, and `"hello"` do not.
- **Double booking**: validate no `BOOKED` appointment exists for the same `doctorId` + `appointmentDate` + overlapping time before inserting.
- **Docker Compose URIs**: use container names (e.g., `http://auth-service:8082`), never `localhost`.
- **New endpoints**: place under the existing `@RequestMapping` prefix so gateway routing works without config changes.
