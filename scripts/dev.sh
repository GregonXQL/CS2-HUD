#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pids=()
cleanup() { for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM
(cd "$ROOT/backend" && exec .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000) & pids+=("$!")
(cd "$ROOT/frontend" && exec node node_modules/vite/bin/vite.js --host 0.0.0.0) & pids+=("$!")
if [[ "${1:-}" == "--overlay" ]]; then
  (cd "$ROOT/overlay" && npm run build)
  (cd "$ROOT/overlay" && unset ELECTRON_RUN_AS_NODE && export OVERLAY_URL='http://localhost:5173/hud?overlay=1' && exec "$(node -p "require('electron')")" .) & pids+=("$!")
fi
wait
