#!/bin/bash
# Full project startup script

echo "🚀 Starting EcoPlan Hub (Full Stack)"
echo "===================================="

# Check if terminal exists
if [ -z "$1" ]; then
    echo "Usage: ./start.sh [dev|prod]"
    exit 1
fi

MODE=$1

# Start backend
echo "📦 Starting Backend Server..."
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Give backend time to start
sleep 3

# Initialize database
echo "🗄️  Initializing Database..."
python seed_db.py
echo "✅ Database initialized"

# Start frontend
echo "🎨 Starting Frontend Server..."
cd ../
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "🎉 EcoPlan Hub is running!"
echo "===================================="
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo "Docs:     http://localhost:8000/docs"
echo "===================================="
echo ""
# Start Telegram Bot (optional — only if TELEGRAM_BOT_TOKEN is set in backend/.env)
echo "🤖 Checking Telegram Bot..."
if grep -q "TELEGRAM_BOT_TOKEN=[^[:space:]]" backend/.env 2>/dev/null; then
    echo "Starting Telegram Bot..."
    cd backend && python run_bot.py &
    BOT_PID=$!
    echo "✅ Telegram Bot started (PID: $BOT_PID)"
    cd ..
else
    echo "ℹ️  TELEGRAM_BOT_TOKEN not set — skipping Telegram Bot"
fi

echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
