# Full project startup script for Windows PowerShell

Write-Host "🚀 Starting EcoPlan Hub (Full Stack)" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Start backend
Write-Host "`n📦 Starting Backend Server..." -ForegroundColor Yellow
cd backend
Write-Host "Installing dependencies..." -ForegroundColor Gray
pip install -r requirements.txt -q

Write-Host "Starting uvicorn..." -ForegroundColor Gray
$backendProcess = Start-Process python -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" -PassThru
Write-Host "✅ Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green

# Give backend time to start
Start-Sleep -Seconds 3

# Initialize database
Write-Host "`n🗄️  Initializing Database..." -ForegroundColor Yellow
python seed_db.py
Write-Host "✅ Database initialized" -ForegroundColor Green

# Go back to root
cd ..

# Start frontend
Write-Host "`n🎨 Starting Frontend Server..." -ForegroundColor Yellow
Write-Host "Installing dependencies..." -ForegroundColor Gray
npm install -q

Write-Host "Starting dev server..." -ForegroundColor Gray
$frontendProcess = Start-Process npm -ArgumentList "run", "dev" -PassThru
Write-Host "✅ Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 EcoPlan Hub is running!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Docs:     http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
# Start Telegram Bot (optional — only if TELEGRAM_BOT_TOKEN is set in backend/.env)
Write-Host "`n🤖 Checking Telegram Bot..." -ForegroundColor Yellow
$envContent = Get-Content backend/.env -ErrorAction SilentlyContinue
if ($envContent -match "TELEGRAM_BOT_TOKEN=[^\s]") {
    Write-Host "Starting Telegram Bot..." -ForegroundColor Gray
    $botProcess = Start-Process python -ArgumentList "run_bot.py" -WorkingDirectory "backend" -PassThru
    Write-Host "✅ Telegram Bot started (PID: $($botProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "ℹ️  TELEGRAM_BOT_TOKEN not set — skipping Telegram Bot" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press Ctrl+C in each terminal to stop the servers" -ForegroundColor Yellow

# Wait for processes
$backendProcess.WaitForExit()
$frontendProcess.WaitForExit()
