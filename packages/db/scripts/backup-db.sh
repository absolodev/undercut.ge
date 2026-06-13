#!/usr/bin/env bash
# UnderCut PostgreSQL backup wrapper.
# Usage: ./scripts/backup-db.sh
# Requires DATABASE_URL in environment or apps/web/.env.local (loaded automatically).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PKG_DIR/../.." && pwd)"
BACKUP_DIR="$PKG_DIR/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="$BACKUP_DIR/undercut_${TIMESTAMP}.sql.gz"

if [[ -z "${DATABASE_URL:-}" ]]; then
  for env_file in "$REPO_ROOT/apps/web/.env.local" "$REPO_ROOT/.env" "$REPO_ROOT/.env.local"; do
    if [[ -f "$env_file" ]]; then
      # shellcheck disable=SC1090
      set -a && source "$env_file" && set +a
      break
    fi
  done
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set. Export it or add to apps/web/.env.local" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  for candidate in /opt/homebrew/opt/libpq/bin /usr/local/opt/libpq/bin; do
    if [[ -x "$candidate/pg_dump" ]]; then
      export PATH="$candidate:$PATH"
      break
    fi
  done
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump not found. Install PostgreSQL client tools." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# pg_dump does not accept Prisma-style query params (e.g. ?schema=public)
PG_URL="${DATABASE_URL%%\?*}"

echo "Backing up database to $OUTPUT_FILE ..."
pg_dump "$PG_URL" --no-owner --no-acl --format=plain | gzip > "$OUTPUT_FILE"

echo "Backup complete: $OUTPUT_FILE ($(du -h "$OUTPUT_FILE" | cut -f1))"
