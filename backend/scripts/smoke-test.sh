#!/usr/bin/env bash

set -u

BASE_URL="${BASE_URL:-http://localhost:8080}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-15}"
WITH_UP="false"
SKIP_SEND_MESSAGE="false"
OAUTH_CLIENT_ID="${OAUTH_CLIENT_ID:-chatbot-client}"
OAUTH_CLIENT_SECRET="${OAUTH_CLIENT_SECRET:-chatbot-secret}"
OAUTH_SCOPE="${OAUTH_SCOPE:-api.read api.write}"
ACCESS_TOKEN=""

usage() {
  cat <<'EOF'
Usage:
  ./scripts/smoke-test.sh [options]

Options:
  --base-url <url>        Base URL for gateway (default: http://localhost:8080)
  --with-up               Start stack using docker compose up -d --build
  --skip-send-message     Skip WhatsApp sendmessage endpoint check
  --oauth-client-id <id>  OAuth2 client id (default: chatbot-client)
  --oauth-client-secret   OAuth2 client secret (default: chatbot-secret)
  --oauth-scope <scope>   OAuth2 scope (default: "api.read api.write")
  --timeout <seconds>     Curl timeout per request (default: 15)
  -h, --help              Show this help

Examples:
  ./scripts/smoke-test.sh
  ./scripts/smoke-test.sh --with-up
  ./scripts/smoke-test.sh --base-url http://localhost:8080 --timeout 20
  ./scripts/smoke-test.sh --oauth-client-id chatbot-client --oauth-client-secret chatbot-secret
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="$2"
      shift 2
      ;;
    --with-up)
      WITH_UP="true"
      shift
      ;;
    --skip-send-message)
      SKIP_SEND_MESSAGE="true"
      shift
      ;;
    --oauth-client-id)
      OAUTH_CLIENT_ID="$2"
      shift 2
      ;;
    --oauth-client-secret)
      OAUTH_CLIENT_SECRET="$2"
      shift 2
      ;;
    --oauth-scope)
      OAUTH_SCOPE="$2"
      shift 2
      ;;
    --timeout)
      TIMEOUT_SECONDS="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 2
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "FAIL: curl is required but not installed"
  exit 2
fi

if [[ "$WITH_UP" == "true" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "FAIL: docker is required for --with-up"
    exit 2
  fi

  echo "Starting stack with docker compose..."
  if ! docker compose up -d --build; then
    echo "FAIL: docker compose up failed"
    exit 1
  fi
fi

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "PASS: $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "FAIL: $1"
}

code_matches() {
  local actual="$1"
  local expected_csv="$2"
  local expected
  IFS=',' read -r -a expected <<< "$expected_csv"
  for code in "${expected[@]}"; do
    if [[ "$actual" == "$code" ]]; then
      return 0
    fi
  done
  return 1
}

run_check() {
  local name="$1"
  local method="$2"
  local url="$3"
  local expected_codes="$4"
  local body="${5:-}"
  local body_regex="${6:-}"
  local content_type_regex="${7:-}"
  local use_bearer="${8:-false}"

  local response_file
  response_file="$(mktemp)"

  local curl_cmd=(curl -sS -m "$TIMEOUT_SECONDS" -o "$response_file" -w "%{http_code}|%{content_type}" -X "$method" "$url")

  if [[ "$use_bearer" == "true" ]]; then
    curl_cmd+=( -H "Authorization: Bearer $ACCESS_TOKEN" )
  fi

  local curl_meta
  if [[ -n "$body" ]]; then
    curl_cmd+=( -H "Content-Type: application/json" -d "$body" )
    curl_meta="$("${curl_cmd[@]}" 2>/dev/null)"
  else
    curl_meta="$("${curl_cmd[@]}" 2>/dev/null)"
  fi

  if [[ -z "$curl_meta" ]]; then
    fail "$name (request failed: $method $url)"
    rm -f "$response_file"
    return
  fi

  local status
  local content_type
  status="${curl_meta%%|*}"
  content_type="${curl_meta#*|}"

  if ! code_matches "$status" "$expected_codes"; then
    fail "$name (expected $expected_codes got $status)"
    rm -f "$response_file"
    return
  fi

  if [[ -n "$body_regex" ]]; then
    if ! grep -Eq "$body_regex" "$response_file"; then
      fail "$name (response body missing pattern: $body_regex)"
      rm -f "$response_file"
      return
    fi
  fi

  if [[ -n "$content_type_regex" ]]; then
    if ! echo "$content_type" | grep -Eq "$content_type_regex"; then
      fail "$name (content-type '$content_type' does not match $content_type_regex)"
      rm -f "$response_file"
      return
    fi
  fi

  pass "$name"
  rm -f "$response_file"
}

fetch_access_token() {
  local token_response_file
  token_response_file="$(mktemp)"

  local oauth_meta
  oauth_meta="$(curl -sS -m "$TIMEOUT_SECONDS" -o "$token_response_file" -w "%{http_code}" \
    -X POST "$BASE_URL/auth/oauth2/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=client_credentials" \
    --data-urlencode "client_id=$OAUTH_CLIENT_ID" \
    --data-urlencode "client_secret=$OAUTH_CLIENT_SECRET" \
    --data-urlencode "scope=$OAUTH_SCOPE" 2>/dev/null || true)"

  if [[ "$oauth_meta" != "200" ]]; then
    fail "OAuth token request (expected 200 got ${oauth_meta:-request-failed})"
    rm -f "$token_response_file"
    return 1
  fi

  ACCESS_TOKEN="$(sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$token_response_file" | head -n 1)"

  if [[ -z "$ACCESS_TOKEN" ]]; then
    fail "OAuth token parsing"
    rm -f "$token_response_file"
    return 1
  fi

  pass "OAuth token request"
  rm -f "$token_response_file"
  return 0
}

wait_for_gateway() {
  local tries=60
  local sleep_seconds=2
  local i

  echo "Waiting for gateway readiness at $BASE_URL/actuator/health/readiness"
  for ((i = 1; i <= tries; i++)); do
    local code
    code="$(curl -sS -m 5 -o /dev/null -w "%{http_code}" "$BASE_URL/actuator/health/readiness" 2>/dev/null || true)"
    if [[ "$code" == "200" ]]; then
      echo "Gateway is ready"
      return 0
    fi
    sleep "$sleep_seconds"
  done

  echo "Gateway readiness check timed out"
  return 1
}

if [[ "$WITH_UP" == "true" ]]; then
  if ! wait_for_gateway; then
    echo "FAIL: stack started but gateway readiness did not become healthy"
    exit 1
  fi
fi

TS="$(date +%s)"
AUTH_EMAIL="smoke-${TS}@example.com"
AUTH_PHONE="9${TS: -9}"

AUTH_REGISTER_PAYLOAD="{\"fullname\":\"Smoke User ${TS}\",\"email\":\"${AUTH_EMAIL}\",\"phone_number\":\"${AUTH_PHONE}\",\"password\":\"Pass@123\"}"
AUTH_LOGIN_PAYLOAD="{\"email\":\"${AUTH_EMAIL}\",\"password\":\"Pass@123\"}"
APPOINTMENT_PAYLOAD="{\"userId\":\"SMOKE-${TS}\",\"appointmentDate\":\"2026-03-20\",\"doctor\":\"Dr Smoke\",\"time\":\"10:30\"}"
WEBHOOK_PAYLOAD='{"entry":[]}'
SEND_PAYLOAD='{"number":"919999999999","message":"smoke test"}'

run_check "Gateway readiness" "GET" "$BASE_URL/actuator/health/readiness" "200"
run_check "Auth register" "POST" "$BASE_URL/auth/auth-service" "201" "$AUTH_REGISTER_PAYLOAD"
run_check "Auth login" "POST" "$BASE_URL/auth/auth-service/login" "200" "$AUTH_LOGIN_PAYLOAD" "token"

if fetch_access_token; then
  run_check "Auth list" "GET" "$BASE_URL/auth/auth-service/findall" "200" "" "" "" "true"
  run_check "Appointment create" "POST" "$BASE_URL/book/api/appointments" "200" "$APPOINTMENT_PAYLOAD" "" "" "true"
  run_check "Appointment list" "GET" "$BASE_URL/book/api/appointments" "200" "" "" "" "true"
  run_check "Appointment range" "GET" "$BASE_URL/book/api/appointments/range?from=2026-03-01&to=2026-03-31" "200" "" "" "" "true"
  run_check "Chat webhook" "POST" "$BASE_URL/chat/api/whatsapp/webhook" "200" "$WEBHOOK_PAYLOAD" "" "" "true"
  run_check "QR generate" "GET" "$BASE_URL/chat/api/qr/generate?phoneNumber=919999999999&appointmentType=doctor&userId=SMOKE-${TS}" "200" "" "" "image/png" "true"
else
  echo "SKIP: Protected endpoint checks because OAuth token request failed"
fi

if [[ "$SKIP_SEND_MESSAGE" == "true" ]]; then
  echo "SKIP: Chat sendmessage"
else
  if [[ -n "$ACCESS_TOKEN" ]]; then
    # This endpoint can return 500 if external WhatsApp credentials/network are unavailable.
    run_check "Chat sendmessage" "POST" "$BASE_URL/chat/api/whatsapp/sendmessage" "200,500" "$SEND_PAYLOAD" "" "" "true"
  else
    echo "SKIP: Chat sendmessage (no OAuth access token)"
  fi
fi

echo ""
echo "Smoke test summary: pass=$PASS_COUNT fail=$FAIL_COUNT"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi

exit 0
