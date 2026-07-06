---
applyTo: "backend/**"
---
# Backend Microservices Conventions

Java 17, Spring Boot 3.2–3.4, Spring Cloud 2023/2024, Maven, MongoDB, Redis (chat only).

## Package Layout (all services)
```
com.arnan.<service>.controller   — @RestController
com.arnan.<service>.service      — @Service, constructor injection only
com.arnan.<service>.repository   — MongoDB access
com.arnan.<service>.entity       — @Document, explicit getters/setters (NO Lombok)
com.arnan.<service>.dto          — request/response DTOs + @Valid annotations
com.arnan.<service>.config       — @Configuration beans
com.arnan.<service>.exception    — GlobalExceptionHandler (@RestControllerAdvice)
```

## Mandatory Practices
- Constructor injection only — never `@Autowired` on fields.
- `private static final Logger log = LoggerFactory.getLogger(Foo.class);` in every class.
- Set `createdAt = LocalDateTime.now()` on create; `updatedAt = LocalDateTime.now()` on both create and update.
- Validate all controller inputs with `@Valid` + constraint annotations on DTOs.
- New endpoints must be under the service's existing `@RequestMapping` prefix.
- Never add `@CrossOrigin` — CORS lives exclusively at the gateway.

## MongoDB Access Pattern by Service
| Service | Pattern |
|---|---|
| `book_appointment` | Raw `MongoClient` → `MongoCollection<Document>`; `Filters.*` static imports |
| `auth-service` | `MongoTemplate` + raw `org.bson.Document` |
| `chat` | `MongoTemplate`; collections in `chatdb` |
| `i18n-service` | `LabelRepository extends MongoRepository` |

Never mix patterns within a service. New services default to Spring Data `MongoRepository`.

## Security
- JWT HS256: `NimbusJwtDecoder` (servlet) / `NimbusReactiveJwtDecoder` (gateway).
- Secret from `${JWT_SECRET}` — **no literal fallback value ever**.
- Public paths only: `OPTIONS /**`, `/actuator/**`, `/swagger-ui/**`, `/v3/api-docs/**`.
- New endpoints are authenticated unless the request explicitly states otherwise.

## Config Profiles
- `default` (local/localhost), `dev`, `prod` — each service has all three except `gateway` and `eureka-server` which use a single `application.yml`.
- `${ENV_VAR:localhost-fallback}` for URIs; `${ENV_VAR}` (no fallback) for secrets.

## gateway/application.yml Pitfall
Never duplicate root-level YAML keys — causes `DuplicateKeyException` at startup.
