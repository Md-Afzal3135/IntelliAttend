#!/bin/bash
# IntelliAttend — First-time setup script
# Usage: bash setup.sh

set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🧠 IntelliAttend — First Time Setup"
echo "════════════════════════════════════"

# ─── Backend Setup ────────────────────────────────────────────────────────────
echo ""
echo "📦 Setting up Django Backend..."
cd "$ROOT_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q
python manage.py migrate
python manage.py seed_data
echo "  ✅ Backend ready"

# ─── AI Service Setup ─────────────────────────────────────────────────────────
echo ""
echo "🤖 Setting up AI Service..."
cd "$ROOT_DIR/ai_service"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q
echo "  ✅ AI service ready (running in mock mode)"
echo "  ℹ️  For full AI: brew install cmake && pip install dlib face-recognition opencv-python mediapipe"

# ─── Frontend Setup ───────────────────────────────────────────────────────────
echo ""
echo "⚛️  Setting up React Frontend..."
cd "$ROOT_DIR/frontend"
if [ -f package-lock.json ]; then
  npm ci -q
else
  npm install -q
fi
echo "  ✅ Frontend ready"

echo ""
echo "════════════════════════════════════"
echo "✅ Setup complete! Run: bash start.sh"
echo "════════════════════════════════════"
