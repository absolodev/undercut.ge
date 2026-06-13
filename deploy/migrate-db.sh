#!/usr/bin/env bash
# UnderCut — restore PostgreSQL from a plain SQL gzip backup (pg_dump --format=plain).
# Does NOT run db:seed or full historical sync.
#
# Usage:
#   ./deploy/migrate-db.sh /opt/undercut/backups/pitwall_20260613_214832.sql.gz
#   DATABASE_URL=postgresql://... ./deploy/migrate-db.sh backup.sql.gz

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <path-to-backup.sql.gz>" >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  for env_file in "$REPO_ROOT/.env" "$REPO_ROOT/apps/web/.env.local" "/opt/undercut/.env"; do
    if [[ -f "$env_file" ]]; then
      # shellcheck disable=SC1090
      set -a && source "$env_file" && set +a
      break
    fi
  done
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. Install postgresql-client." >&2
  exit 1
fi

PG_URL="${DATABASE_URL%%\?*}"

echo "==> Restoring database from $BACKUP_FILE"
echo "    Target: ${PG_URL%%@*}@***"
echo "    WARNING: This will import into the target database. Ensure it is empty or you accept overwrites."

confirm="n"
if [[ "${RESTORE_YES:-}" == "1" ]]; then
  confirm="y"
else
  read -r -p "Continue? [y/N] " confirm
fi
if [[ "${confirm,,}" != "y" ]]; then
  echo "Aborted."
  exit 0
fi

echo "==> Running Prisma migrations (schema only, no seed)..."
cd "$REPO_ROOT"
env -u NODE_ENV pnpm install --frozen-lockfile 2>/dev/null || env -u NODE_ENV pnpm install
env -u NODE_ENV pnpm db:push

echo "==> Importing SQL dump..."
gunzip -c "$BACKUP_FILE" | psql "$PG_URL" --set ON_ERROR_STOP=1 --quiet

echo "==> Restore complete."
