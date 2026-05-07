# Windows PowerShell script to build all services in ChatBot-Pro

$services = @(
    "auth-service",
    "book_appointment",
    "chat",
    "eureka-server",
    "gateway",
    "i18n-service"
)

foreach ($service in $services) {
    Write-Host "\nBuilding $service..."
    Push-Location $service
    if (Test-Path ".\mvnw.cmd") {
        .\mvnw.cmd clean install
    } elseif (Get-Command mvn -ErrorAction SilentlyContinue) {
        Write-Host "mvnw.cmd not found, using global Maven for $service."
        mvn clean install
    } else {
        Write-Host "mvnw.cmd not found in $service. To fix this, run the following command in the $service directory:"
        Write-Host "mvn -N io.takari:maven:wrapper"
        Write-Host "Skipping $service."
    }
    Pop-Location
}
Write-Host "\nAll builds attempted. Check above for any errors."
