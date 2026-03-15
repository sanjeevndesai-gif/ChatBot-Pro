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

## One-command smoke test

```bash
./scripts/smoke-test.sh --with-up
```
