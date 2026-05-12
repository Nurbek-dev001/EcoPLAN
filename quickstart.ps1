#!/usr/bin/env pwsh

# Quick Start Script for EcoPlan Hub
# This script sets up and runs the entire project in one go

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 EcoPlan Hub - Quick Start          ║" -ForegroundColor Cyan
Write-Host "║  Automated Budget Planning System      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if ($pythonVersion) {
    Write-Host "✅ Python $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Python not found. Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "✅ npm $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Setting up Backend..." -ForegroundColor Yellow
cd backend

Write-Host "  Installing Python dependencies..." -ForegroundColor Gray
pip install -r requirements.txt -q --disable-pip-version-check

Write-Host "  Initializing Database..." -ForegroundColor Gray
python seed_db.py

Write-Host "✅ Backend ready!" -ForegroundColor Green

cd ..

Write-Host ""
Write-Host "📦 Setting up Frontend..." -ForegroundColor Yellow

Write-Host "  Installing npm dependencies..." -ForegroundColor Gray
npm install -q

Write-Host "✅ Frontend ready!" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Starting Servers...                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Opening new terminals for servers..." -ForegroundColor Yellow
Write-Host ""

# Start backend in new window
Write-Host "  Starting Backend on http://localhost:8000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @('-NoExit', '-Command', 'cd backend; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000')

Start-Sleep -Seconds 2

# Start frontend in new window
Write-Host "  Starting Frontend on http://localhost:5173" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @('-NoExit', '-Command', 'npm run dev')

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  🎉 EcoPlan Hub is Running!            ║" -ForegroundColor Green
Write-Host "╠════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Frontend: http://localhost:5173      ║" -ForegroundColor Cyan
Write-Host "║  Backend:  http://localhost:8000      ║" -ForegroundColor Cyan
Write-Host "║  API Docs: http://localhost:8000/docs ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  📧 Login Demo:                        ║" -ForegroundColor Green
Write-Host "║     Email: manager@ktz.kz             ║" -ForegroundColor Cyan
Write-Host "║     Pass:  password123                ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  💡 Available Roles:                   ║" -ForegroundColor Green
Write-Host "║     • manager@ktz.kz (Manager)        ║" -ForegroundColor Cyan
Write-Host "║     • analyst@ktz.kz (Analyst)        ║" -ForegroundColor Cyan
Write-Host "║     • director@ktz.kz (Director)      ║" -ForegroundColor Cyan
Write-Host "║     • checker@ktz.kz (Checker)        ║" -ForegroundColor Cyan
Write-Host "║     • admin@ktz.kz (Admin)            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "✨ Ready to use! Open http://localhost:5173 in your browser" -ForegroundColor Green
