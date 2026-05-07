# PowerShell script to run all ChatBot-Pro backend services locally (no Docker)
# Start order: eureka-server first, then all other services.
# Each service opens in its own PowerShell window.
#
# Prerequisites:
#   - Java 17+ installed
#   - MongoDB running on localhost:27017
#   - Redis running on localhost:6379 (required by chat service)
#
# Ports:
#   eureka-server   : 8761
#   gateway         : 8080
#   auth-service    : 8082
#   book_appointment: 9091
#   chat            : 9090
#   i18n-service    : 9092

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

$eurekUrl = "http://localhost:8761/eureka/"
$jvmArgs  = "-DEUREKA_CLIENT_SERVICE_URL_DEFAULTZONE=$eurekUrl"

# --- 1. Start Eureka first (others depend on it) ---
Write-Host "Starting eureka-server on port 8761..."
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "Set-Location '$root\eureka-server'; mvn spring-boot:run"

Write-Host "Waiting 20s for Eureka to be ready..."
Start-Sleep -Seconds 20

# --- 2. Start remaining services ---
$services = @(
    @{ Name = "auth-service";      UseMvnw = $true  },
    @{ Name = "book_appointment";  UseMvnw = $true  },
    @{ Name = "chat";              UseMvnw = $true  },
    @{ Name = "gateway";           UseMvnw = $false },
    @{ Name = "i18n-service";      UseMvnw = $false }
)

foreach ($svc in $services) {
    $dir = "$root\$($svc.Name)"
    $mvn = if ($svc.UseMvnw) { ".\mvnw.cmd" } else { "mvn" }
    $cmd = "$mvn spring-boot:run -Dspring-boot.run.jvmArguments=`"$jvmArgs`""
    Write-Host "Starting $($svc.Name)..."
    Start-Process powershell -ArgumentList "-NoExit", "-Command",
        "Set-Location '$dir'; $cmd"
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Host "All services are starting. Monitor each PowerShell window for logs."
Write-Host ""
Write-Host "Service URLs:"
Write-Host "  Eureka dashboard : http://localhost:8761"
Write-Host "  Gateway (API)    : http://localhost:8080"
Write-Host "  Auth service     : http://localhost:8082"
Write-Host "  Book appointment : http://localhost:9091"
Write-Host "  Chat             : http://localhost:9090"
Write-Host "  i18n service     : http://localhost:9092"
