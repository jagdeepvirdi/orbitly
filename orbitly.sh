#!/usr/bin/env bash
# Usage: ./orbitly.sh {dev|prod} {start|stop|restart}
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

DEV_PORT=5177
PROD_PORT=4177
API_PORT=3003
DEV_PID_FILE=".orbitly-dev.pid"
PROD_PID_FILE=".orbitly-prod.pid"
API_PID_FILE=".orbitly-api.pid"
LOG_DIR=".orbitly-logs"

usage() {
  echo "Usage: $0 {dev|prod} {start|stop|restart}"
  exit 1
}

is_running() {
  kill -0 "$1" 2>/dev/null
}

# ── Docker ────────────────────────────────────────────────────────────────────

start_database() {
  local status
  status=$(docker compose ps db --format json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('State',''))" 2>/dev/null || echo "")
  if [[ "$status" == "running" ]]; then
    echo "  DB already running -> postgres://localhost:5437/orbitly"
    return
  fi
  echo "  Starting database..."
  docker compose up -d db >/dev/null 2>&1
  local tries=0 health=""
  while [[ "$health" != "healthy" && $tries -lt 15 ]]; do
    sleep 2
    health=$(docker inspect --format '{{.State.Health.Status}}' orbitly-postgres 2>/dev/null || echo "")
    ((tries++)) || true
  done
  if [[ "$health" == "healthy" ]]; then
    echo "  ✓ Database healthy   -> postgres://localhost:5437/orbitly"
  else
    echo "  ⚠ Database did not become healthy in time — check: docker logs orbitly-postgres" >&2
  fi
}

stop_database() {
  local status
  status=$(docker compose ps db --format json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('State',''))" 2>/dev/null || echo "")
  if [[ "$status" != "running" ]]; then
    echo "  Database is not running"
    return
  fi
  docker compose stop db >/dev/null 2>&1
  echo "  ✓ Database stopped"
}

# ── Dev ───────────────────────────────────────────────────────────────────────

start_dev() {
  if [[ -f "$DEV_PID_FILE" ]]; then
    local pid; pid=$(cat "$DEV_PID_FILE")
    if is_running "$pid"; then
      echo "  Dev server already running  (PID $pid) -> http://localhost:$DEV_PORT"
      return
    fi
    rm -f "$DEV_PID_FILE"
  fi
  mkdir -p "$LOG_DIR"
  nohup npm run dev > "$LOG_DIR/dev.log" 2>&1 &
  echo $! > "$DEV_PID_FILE"
  sleep 2
  echo "  ✓ Dev server started  (PID $(cat "$DEV_PID_FILE")) -> http://localhost:$DEV_PORT"
  echo "    Logs: $LOG_DIR/dev.log"
}

stop_dev() {
  if [[ ! -f "$DEV_PID_FILE" ]]; then
    echo "  Dev server is not running (no PID file)"
    return
  fi
  local pid; pid=$(cat "$DEV_PID_FILE")
  if is_running "$pid"; then
    kill "$pid"
    echo "  ✓ Dev server stopped  (PID $pid)"
  else
    echo "  Dev server was not running (stale PID $pid — cleaned up)"
  fi
  rm -f "$DEV_PID_FILE"
}

# ── Prod ──────────────────────────────────────────────────────────────────────

start_prod() {
  if [[ -f "$PROD_PID_FILE" ]]; then
    local pid; pid=$(cat "$PROD_PID_FILE")
    if is_running "$pid"; then
      echo "  Production server already running  (PID $pid) -> http://localhost:$PROD_PORT"
      return
    fi
    rm -f "$PROD_PID_FILE"
  fi
  rm -f "$API_PID_FILE"

  echo "  Building for production..."
  npm run build
  mkdir -p "$LOG_DIR"

  nohup node server/index.js > "$LOG_DIR/api.log" 2>&1 &
  echo $! > "$API_PID_FILE"

  nohup npm run preview > "$LOG_DIR/prod.log" 2>&1 &
  echo $! > "$PROD_PID_FILE"

  sleep 2
  echo "  ✓ API server started     (PID $(cat "$API_PID_FILE"))  -> http://localhost:$API_PORT"
  echo "  ✓ Production UI started  (PID $(cat "$PROD_PID_FILE")) -> http://localhost:$PROD_PORT"
  echo "    Logs: $LOG_DIR/api.log  |  $LOG_DIR/prod.log"
}

stop_prod() {
  local any=0

  if [[ -f "$PROD_PID_FILE" ]]; then
    local pid; pid=$(cat "$PROD_PID_FILE")
    if is_running "$pid"; then
      kill "$pid"
      echo "  ✓ Production UI stopped  (PID $pid)"
    else
      echo "  Production UI was not running (stale PID $pid — cleaned up)"
    fi
    rm -f "$PROD_PID_FILE"
    any=1
  fi

  if [[ -f "$API_PID_FILE" ]]; then
    local api_pid; api_pid=$(cat "$API_PID_FILE")
    if is_running "$api_pid"; then
      kill "$api_pid"
      echo "  ✓ API server stopped     (PID $api_pid)"
    else
      echo "  API server was not running (stale PID $api_pid — cleaned up)"
    fi
    rm -f "$API_PID_FILE"
    any=1
  fi

  [[ $any -eq 0 ]] && echo "  Production server is not running (no PID files)"
}

# ── Dispatch ──────────────────────────────────────────────────────────────────

# Default to "dev start" when called with no arguments
MODE="${1:-dev}"
ACTION="${2:-start}"

case "$MODE-$ACTION" in
  dev-start)
    echo; echo "[Orbitly] Starting dev stack..."
    start_database
    start_dev
    echo
    ;;
  dev-stop)
    echo; echo "[Orbitly] Stopping dev stack..."
    stop_dev
    stop_database
    echo
    ;;
  dev-restart)
    echo; echo "[Orbitly] Restarting dev stack..."
    stop_dev
    start_dev
    echo
    ;;
  prod-start)
    echo; echo "[Orbitly] Starting production stack..."
    start_database
    start_prod
    echo
    ;;
  prod-stop)
    echo; echo "[Orbitly] Stopping production stack..."
    stop_prod
    stop_database
    echo
    ;;
  prod-restart)
    echo; echo "[Orbitly] Restarting production stack (stop → build → start)..."
    stop_prod
    start_database
    start_prod
    echo
    ;;
  *) usage ;;
esac

