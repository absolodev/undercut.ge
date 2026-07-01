#!/usr/bin/env bash
# Incremental Jolpica sync for production. Safe to run repeatedly (no full seed).
set -euo pipefail

APP_DIR="${UNDERCUT_APP_DIR:-/opt/undercut/app}"
ENV_FILE="${UNDERCUT_ENV_FILE:-/opt/undercut/.env}"
LOG_DIR="${UNDERCUT_LOG_DIR:-/opt/undercut/logs}"
LOG_FILE="${LOG_DIR}/sync-latest.log"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) sync:latest start ==="
  pnpm sync:latest
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) sync:latest done ==="
} >>"$LOG_FILE" 2>&1
