#!/usr/bin/env bash
# UnderCut — one-shot VPS bootstrap for 23.88.46.52 (run as root on the server)
# Usage: curl -fsSL ... | bash   OR   bash deploy/remote-bootstrap.sh
set -euo pipefail

APP_DIR=/opt/undercut
REPO_DIR="$APP_DIR/app"
REPO_URL="${REPO_URL:-git@github.com:absolodev/undercut.ge.git}"
BACKUP_PATH="${BACKUP_PATH:-$APP_DIR/backups/pitwall_20260613_214832.sql.gz}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

bash "$REPO_DIR/deploy/setup-server.sh" 2>/dev/null || bash /tmp/setup-server.sh || {
  echo "Copy deploy/setup-server.sh to /tmp/setup-server.sh first." >&2
  exit 1
}

npm install -g pm2

if [[ ! -d "$REPO_DIR/.git" ]]; then
  sudo -u undercut git clone "$REPO_URL" "$REPO_DIR"
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  PW=$(openssl rand -hex 16)
  cat >"$APP_DIR/.env" <<EOF
NEXT_PUBLIC_SITE_URL=https://undercut.ge
CURRENT_SEASON=2026
DATABASE_URL=postgresql://undercut:${PW}@127.0.0.1:5432/undercut
POSTGRES_PASSWORD=${PW}
NODE_ENV=production
PORT=3000
EOF
  chmod 600 "$APP_DIR/.env"
  chown undercut:undercut "$APP_DIR/.env"
fi

cp "$APP_DIR/.env" "$REPO_DIR/.env"
cp "$APP_DIR/.env" "$REPO_DIR/apps/web/.env.local"
chown undercut:undercut "$REPO_DIR/.env" "$REPO_DIR/apps/web/.env.local"

cd "$REPO_DIR"
set -a && source "$APP_DIR/.env" && set +a
docker compose -f deploy/docker-compose.prod.yml up -d postgres

if [[ -f "$BACKUP_PATH" ]]; then
  sudo -u undercut env HOME=/home/undercut RESTORE_YES=1 CI=true bash -c "cd $REPO_DIR && bash deploy/migrate-db.sh $BACKUP_PATH"
fi

sudo -u undercut env HOME=/home/undercut CI=true bash -c "cd $REPO_DIR && bash deploy/deploy.sh"

cp "$REPO_DIR/deploy/nginx-undercut.ge.conf" /etc/nginx/sites-available/undercut.ge
ln -sf /etc/nginx/sites-available/undercut.ge /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "Bootstrap complete. Point undercut.ge A record to this server, then: certbot --nginx -d undercut.ge -d www.undercut.ge"
