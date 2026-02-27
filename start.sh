#!/bin/bash
# Start the Resume Customization Agent

echo "🚀 Starting Resume Customization Agent..."

# Check ANTHROPIC_API_KEY
if [ -z "$ANTHROPIC_API_KEY" ]; then
  if [ -f backend/.env ]; then
    export $(grep -v '^#' backend/.env | xargs)
  else
    echo "⚠️  Warning: ANTHROPIC_API_KEY not set. Please set it before starting."
    echo "   Run: export ANTHROPIC_API_KEY=your_key_here"
  fi
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q
cd ..

# Build frontend first (backend needs frontend/dist to serve the SPA)
echo "🌐 Building frontend..."
cd frontend
npm install --silent
npm run build
cd ..

# Start backend (after dist exists so main.py mounts static files)
echo "🔧 Starting backend on http://localhost:8000 ..."
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

echo ""
echo "✅ Application is ready!"
echo "   Open http://localhost:8000 in your browser"
echo ""
echo "Press Ctrl+C to stop"

wait $BACKEND_PID
