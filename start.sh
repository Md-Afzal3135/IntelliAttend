#!/bin/bash
# IntelliAttend — Start All Services
# Usage: bash start.sh

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🧠 Starting IntelliAttend..."
echo "════════════════════════════════════"

# Kill any existing processes on the ports
kill $(lsof -t -i:8000) 2>/dev/null && echo "  Cleared port 8000" || true
kill $(lsof -t -i:8001) 2>/dev/null && echo "  Cleared port 8001" || true
kill $(lsof -t -i:5173) 2>/dev/null && echo "  Cleared port 5173" || true

sleep 1

# ─── Start Django Backend ─────────────────────────────────────────────────────
echo ""
echo "📦 Starting Django Backend (port 8000)..."
cd "$ROOT_DIR/backend"
source venv/bin/activate
python manage.py runserver 8000 &
BACKEND_PID=$!
echo "  PID: $BACKEND_PID"

# ─── Start AI Service ─────────────────────────────────────────────────────────
echo ""
echo "🤖 Starting AI Service (port 8001)..."
cd "$ROOT_DIR/ai_service"
source venv/bin/activate
FORCE_MOCK_AI=True uvicorn main:app --port 8001 --reload &
AI_PID=$!
echo "  PID: $AI_PID"

# ─── Start Frontend ───────────────────────────────────────────────────────────
echo ""
echo "⚛️  Starting React Frontend (port 5173)..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  PID: $FRONTEND_PID"

sleep 3

echo ""
echo "════════════════════════════════════"
echo "✅ IntelliAttend is running!"
echo ""
echo "  🌐 App:      http://localhost:5173"
echo "  🔌 API:      http://localhost:8000/api"
echo "  🤖 AI:       http://localhost:8001"
echo "  📚 API Docs: http://localhost:8000/api/docs"
echo "  ⚙️  Admin:    http://localhost:8000/admin"
echo ""
echo "Demo credentials:"
echo "  Admin:   admin@intelliattend.com   / Admin@123"
echo "  Teacher: teacher@intelliattend.com / Teacher@123"
echo "  Student: arjun.mehta@student.intelliattend.com / Student@123"
echo "════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait and handle shutdown
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $AI_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
