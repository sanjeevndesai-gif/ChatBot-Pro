# ChatBot-Pro

ChatBot-Pro is a microservice-based chatbot platform with:
- `gateway` (Spring Cloud Gateway)
- `auth-service` (user APIs + OAuth2 token endpoint)
- `book_appointment`
- `chat`
- `eureka-server` (service discovery)

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
