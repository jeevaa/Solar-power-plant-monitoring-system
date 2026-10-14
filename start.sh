#!/usr/bin/env bash

# Solar Power Plant Monitoring and Performance Analysis System
# One-Click Local Launcher Script

set -e

# Export local tools PATH
export PATH="$HOME/.local/bin:$PATH"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "========================================================================"
echo " SOLAR POWER PLANT MONITORING & PERFORMANCE ANALYSIS SYSTEM"
echo " Industrial SCADA & Renewable Energy Engineering Web Application"
echo "========================================================================"

# 1. Check Python and Virtual Environment
if [ ! -d "backend/.venv" ]; then
    echo "[*] Initializing Python virtual environment..."
    uv venv backend/.venv
    uv pip install --python backend/.venv/bin/python -r backend/requirements.txt
fi

# 2. Check / Seed Database
echo "[*] Ensuring database tables and realistic sample data are initialized..."
PYTHONPATH=backend backend/.venv/bin/python backend/seed.py

# 3. Trap exit signals to terminate both servers
cleanup() {
    echo ""
    echo "[*] Stopping servers..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    echo "[✓] Servers stopped cleanly."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 4. Start Flask Backend API
echo "[*] Starting Flask Backend API on http://127.0.0.1:5001..."
PYTHONPATH=backend backend/.venv/bin/python backend/run.py &
BACKEND_PID=$!

# Wait for backend to be ready
echo "[*] Waiting for backend API to be ready..."
for i in {1..15}; do
    if curl -s http://127.0.0.1:5001/api/health >/dev/null 2>&1; then
        echo "[✓] Backend API is up and running!"
        break
    fi
    sleep 1
done

# 5. Start Vite Frontend Development Server
echo "[*] Starting Vite React Frontend on http://localhost:5173..."
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================================================"
echo " APPLICATION READY FOR USE"
echo "========================================================================"
echo " Frontend Web Dashboard : http://localhost:5173"
echo " Backend REST API       : http://127.0.0.1:5001"
echo " API Health Check       : http://127.0.0.1:5001/api/health"
echo "------------------------------------------------------------------------"
echo " Default Demo Logins:"
echo "   Administrator : admin@solarplant.io    / Admin@123"
echo "   Plant Operator: operator@solarplant.io / Operator@123"
echo "   Energy Analyst: viewer@solarplant.io   / Viewer@123"
echo "========================================================================"
echo " Press Ctrl+C in this terminal to stop both servers."
echo ""

# Keep running
wait
