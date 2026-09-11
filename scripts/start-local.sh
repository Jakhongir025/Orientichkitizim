#!/bin/bash
set -euo pipefail
RENTCAR_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RENTCAR_ROOT"
export PATH="$RENTCAR_ROOT/.local/runtime/node/bin:$PATH"
RENTCAR_PG_CTL="$RENTCAR_ROOT/.local/runtime/postgres/bin/pg_ctl"
RENTCAR_PG_DATA="$RENTCAR_ROOT/.local/postgres"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 kerak. README qo‘llanmasiga qarang."
  exit 1
fi
if [ ! -f .env ]; then
  echo ".env mavjud emas. README bo‘yicha sozlang."
  exit 1
fi
mkdir -p .local/logs
if [ -x "$RENTCAR_PG_CTL" ] && [ -d "$RENTCAR_PG_DATA" ]; then
  if ! "$RENTCAR_PG_CTL" -D "$RENTCAR_PG_DATA" status >/dev/null 2>&1; then
    "$RENTCAR_PG_CTL" -D "$RENTCAR_PG_DATA" -l "$RENTCAR_ROOT/.local/logs/postgres.log" -o '-p 55432 -h 127.0.0.1 -k /tmp' start
  fi
fi
# Reuse an already running app instead of spawning a competing server.
if curl --max-time 8 -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
  echo "RentCar allaqachon ishlayapti: http://localhost:3000"
  exit 0
fi
npm run db:migrate
npm run worker >> .local/logs/worker.log 2>&1 &
RENTCAR_WORKER_PID=$!
trap 'kill "$RENTCAR_WORKER_PID" 2>/dev/null || true' EXIT INT TERM
printf '\nRentCar: http://localhost:3000\nTerminalni ochiq qoldiring. To‘xtatish: Ctrl+C.\n\n'
npm run dev
