# PowerShell script to run all ChatBot-Pro services in parallel terminals
# Each service will be started in its own window for easy monitoring

$services = @(
    @{ Name = "auth-service";     Cmd = ".\mvnw.cmd spring-boot:run" },
    @{ Name = "book_appointment";  Cmd = ".\mvnw.cmd spring-boot:run" },
    @{ Name = "chat";              Cmd = ".\mvnw.cmd spring-boot:run" },
    @{ Name = "eureka-server";     Cmd = "mvn spring-boot:run" },
    @{ Name = "gateway";           Cmd = "mvn spring-boot:run" },
    @{ Name = "i18n-service";      Cmd = "mvn spring-boot:run" }
)

foreach ($svc in $services) {
    $dir = $svc.Name
    $cmd = $svc.Cmd
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $dir; $cmd"
    Start-Sleep -Seconds 2 # Stagger startup for clarity
}

Write-Host "All services are starting in separate PowerShell windows."
