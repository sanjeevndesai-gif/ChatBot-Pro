---
name: "run-chatbot-smoke-test"
description: "Run a full ChatBot-Pro smoke test: health-check all services, obtain a JWT, create an appointment, and verify i18n labels. Use after a deploy or Docker Compose start to confirm the stack is operational."
argument-hint: "Base URL (default: http://localhost:8080)"
---

# Run ChatBot-Pro Smoke Test

Verifies the running stack end-to-end via the API gateway. All calls go through `http://localhost:8080` (or the base URL supplied as the argument).

## When to Use
- After `docker compose up --build` to verify all containers are healthy
- After a production deploy to confirm services are reachable
- To diagnose which layer of the stack is broken

## Procedure

### Step 0 — Set base URL
Use the argument if provided; otherwise default to `http://localhost:8080`.

```
BASE_URL = <argument or "http://localhost:8080">
```

### Step 1 — Health check all services

Use the MCP tool `mcp_chatbot-pro-t_health_check_all` if available. Otherwise run:

```powershell
$services = @(
  @{ name="gateway";      url="$BASE_URL/actuator/health" },
  @{ name="auth-service"; url="http://localhost:8082/actuator/health" },
  @{ name="book";         url="http://localhost:9091/actuator/health" },
  @{ name="chat";         url="http://localhost:9090/actuator/health" },
  @{ name="i18n";         url="http://localhost:9092/actuator/health" },
  @{ name="eureka";       url="http://localhost:8761/actuator/health" }
)
foreach ($svc in $services) {
  try {
    $r = Invoke-RestMethod -Uri $svc.url -TimeoutSec 5
    Write-Host "[PASS] $($svc.name): $($r.status)"
  } catch {
    Write-Host "[FAIL] $($svc.name): $($_.Exception.Message)"
  }
}
```

Record each result as `[PASS]` or `[FAIL]`. Stop and report if gateway is `[FAIL]`.

### Step 2 — Obtain a JWT

Use the MCP tool `mcp_chatbot-pro-t_auth_login` if available. Otherwise:

```powershell
$body = '{"username":"smoke-test@example.com","password":"SmokeTest123!"}'
try {
  $r = Invoke-RestMethod -Method Post -Uri "$BASE_URL/auth/login" `
       -ContentType "application/json" -Body $body
  $TOKEN = $r.token
  Write-Host "[PASS] auth/login — token obtained"
} catch {
  Write-Host "[FAIL] auth/login — $($_.Exception.Message)"
  # Attempt registration if login fails (first-run scenario)
  $regBody = '{"username":"smoke-test@example.com","password":"SmokeTest123!","appId":"smoke"}'
  $r2 = Invoke-RestMethod -Method Post -Uri "$BASE_URL/auth/register" `
        -ContentType "application/json" -Body $regBody
  $TOKEN = $r2.token
  Write-Host "[INFO] Registered new smoke-test user"
}
```

If no token is obtained, stop and report.

### Step 3 — Create a test appointment

Use `mcp_chatbot-pro-t_book_create` if available. Otherwise:

```powershell
$appt = @{
  fullName       = "Smoke Test Patient"
  contactNumber  = "9999999999"
  purpose        = "Smoke test checkup"
  appointmentDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
  timeFrom       = "10:00"
  timeTo         = "10:30"
  doctorId       = "smoke-doctor-01"
  doctorPhone    = "9999999998"
  location       = "Test Clinic"
  address        = "123 Smoke St"
  userId         = "smoke-user"
  appId          = "smoke"
} | ConvertTo-Json

try {
  $r = Invoke-RestMethod -Method Post -Uri "$BASE_URL/book/api/appointments" `
       -ContentType "application/json" `
       -Headers @{ Authorization = "Bearer $TOKEN" } `
       -Body $appt
  $APPT_ID = $r._id ?? $r.id
  Write-Host "[PASS] book/create — appointmentNumber: $($r.appointmentNumber)"
} catch {
  Write-Host "[FAIL] book/create — $($_.Exception.Message)"
}
```

### Step 4 — Verify i18n endpoint

```powershell
try {
  $r = Invoke-RestMethod -Uri "$BASE_URL/i18n/labels?locale=en" `
       -Headers @{ Authorization = "Bearer $TOKEN" }
  $count = ($r | Measure-Object).Count
  Write-Host "[PASS] i18n/labels — $count labels returned"
} catch {
  Write-Host "[FAIL] i18n/labels — $($_.Exception.Message)"
}
```

### Step 5 — Cleanup (delete test appointment)

If `$APPT_ID` was captured in Step 3:

```powershell
try {
  Invoke-RestMethod -Method Delete -Uri "$BASE_URL/book/api/appointments/$APPT_ID" `
    -Headers @{ Authorization = "Bearer $TOKEN" }
  Write-Host "[PASS] cleanup — test appointment deleted"
} catch {
  Write-Host "[WARN] cleanup — could not delete test appointment: $($_.Exception.Message)"
}
```

### Step 6 — Summary

Print a summary table:

```
=== ChatBot-Pro Smoke Test Results ===
BASE_URL : <url>
Timestamp: <datetime>

[PASS/FAIL] gateway health
[PASS/FAIL] auth-service health
[PASS/FAIL] book_appointment health
[PASS/FAIL] chat health
[PASS/FAIL] i18n health
[PASS/FAIL] eureka health
[PASS/FAIL] auth login/register
[PASS/FAIL] appointment create
[PASS/FAIL] i18n labels fetch
[PASS/WARN]  cleanup

Overall: PASSED / FAILED
```

If any step is `[FAIL]`, suggest the likely root cause based on the error message and the Known Pitfalls in [AGENTS.md](../../../AGENTS.md).
