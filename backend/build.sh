#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "🔧 Installing backend dependencies..."
pip install -r requirements.txt

echo "🗄️ Running migrations..."
python manage.py migrate

echo "🌱 Seeding database..."
python manage.py seed_data

echo "🚀 Build complete!"
