# EcoPlan Hub — Stop All Services
Write-Host "🛑 Stopping EcoPlan Hub services..." -ForegroundColor Red

# Stop Docker containers
docker-compose down
Write-Host "✅ Docker containers stopped" -ForegroundColor Green

# Kill Python processes (uvicorn, telegram bot)
Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*run_bot*"
} | Stop-Process -Force
Write-Host "✅ Python processes stopped" -ForegroundColor Green

# Kill Node processes (vite dev server)
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*vite*"
} | Stop-Process -Force
Write-Host "✅ Node processes stopped" -ForegroundColor Green

Write-Host "`n🎉 All services stopped!" -ForegroundColor Green
