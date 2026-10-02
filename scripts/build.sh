#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(cd "$ROOT/frontend" && npm ci && npm test && npm run build)
(cd "$ROOT/overlay" && npm ci && npm run build)
echo 'Frontend and desktop compiled. Build the bundled Windows EXE on Windows with scripts/build.ps1.'
