#!/usr/bin/env bash
# UnderCut — pull, build, and restart the web app on VPS.
# Does NOT run db:seed or full sync unless explicitly requested elsewhere.
#
# Usage:
#   ./deploy/deploy.sh
#   ./deploy/deploy.sh --restore-db /opt/undercut/backups/backup.sql.gz
#   ./deploy/deploy.sh --skip-build

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESTORE_DB=""
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore-db)
      RESTORE_DB="${2:-}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

cd "$REPO_ROOT"

if [[ -d .git ]]; then
  echo "==> Pulling latest from origin/main..."
  git fetch origin main
  git checkout main
  git pull --ff-only origin main
fi

echo "==> Installing dependencies..."
env -u NODE_ENV CI=true pnpm install --frozen-lockfile

if [[ -n "$RESTORE_DB" ]]; then
  echo "==> Restoring database from backup..."
  RESTORE_YES=1 bash "$SCRIPT_DIR/migrate-db.sh" "$RESTORE_DB"
fi

if [[ "$SKIP_BUILD" == false ]]; then
  echo "==> Generating Prisma client..."
  env -u NODE_ENV pnpm --filter @pitwall/db exec prisma generate

  echo "==> Building web app..."
  NODE_ENV=production pnpm build --filter=web
fi

echo "==> Restarting PM2 process..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrRestart /opt/undercut/ecosystem.config.cjs --update-env
  pm2 save
else
  echo "PM2 not found. Start manually: cd apps/web && pnpm start"
fi

echo "==> Deploy complete. Site should be live on port 3000 (behind nginx)."
