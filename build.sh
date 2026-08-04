#!/usr/bin/env bash
# exit on error
set -o errexit

echo "📦 [Build] Installing Python backend dependencies..."
pip install -r backend/requirements.txt

echo "📦 [Build] Installing Node packages and compiling frontend React assets..."
cd frontend
npm install
npm run build
cd ..

echo "✅ [Build] Single-service compilation successful and ready to deploy!"
