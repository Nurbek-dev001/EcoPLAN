# EcoPlan Hub - Full Stack Launcher (Persistent)
# Runs all services in separate PowerShell windows

Write-Host "[LAUNCHER] EcoPlan Hub - Starting all services..." -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# 1. Docker Infrastructure
Write-Host "`n[1/4] Starting Docker Infrastructure..." -ForegroundColor Yellow
docker-compose up -d postgres redis zookeeper kafka clickhouse prometheus grafana
Write-Host "[OK] Docker infrastructure started" -ForegroundColor Green

# Wait for PostgreSQL
Write-Host "[INFO] Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 8

# 2. Backend (new window)
Write-Host "`n[2/4] Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    'cd "' + (Get-Location) + '\backend"; $env:PYTHONIOENCODING="utf-8"; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000'
)
Write-Host "[OK] Backend window opened (http://localhost:8000)" -ForegroundColor Green

# 3. Frontend (new window)
Write-Host "`n[3/4] Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    'cd "' + (Get-Location) + '"; $env:NODE_NO_WARNINGS=1; npm run dev'
)
Write-Host "[OK] Frontend window opened (http://localhost:8082)" -ForegroundColor Green

# 4. Telegram Bot (new window)
Write-Host "`n[4/4] Starting Telegram Bot..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    'cd "' + (Get-Location) + '\backend"; python run_bot.py'
)
Write-Host "[OK] Telegram Bot window opened" -ForegroundColor Green

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "[SUCCESS] All services running!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Frontend:   http://localhost:8082" -ForegroundColor Cyan
Write-Host "Backend:    http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs:   http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Grafana:    http://localhost:3000" -ForegroundColor Cyan
Write-Host "Prometheus: http://localhost:9090" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Green
Write-Host "`n[TIP] To stop all services, run: .\stop-all.ps1" -ForegroundColor Yellow
