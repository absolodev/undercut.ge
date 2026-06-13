#!/usr/bin/env bash
# UnderCut — one-time VPS bootstrap (Ubuntu 22.04+)
# Run as root: sudo bash setup-server.sh

set -euo pipefail

APP_USER="${APP_USER:-undercut}"
APP_DIR="/opt/undercut"
REPO_DIR="${APP_DIR}/app"

echo "==> Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx postgresql-client ca-certificates gnupg

echo "==> Installing Node.js 20..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

echo "==> Installing pnpm..."
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@9.15.0 --activate
fi

echo "==> Creating app user and directories..."
id -u "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"
mkdir -p "$APP_DIR/backups" "$APP_DIR/logs" "$REPO_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> Installing PM2 for process management..."
npm install -g pm2

PM2_ECOSYSTEM="${APP_DIR}/ecosystem.config.cjs"
cat > "$PM2_ECOSYSTEM" <<'EOF'
module.exports = {
  apps: [
    {
      name: "undercut-web",
      cwd: "/opt/undercut/app/apps/web",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G",
    },
  ],
};
EOF
chown "$APP_USER:$APP_USER" "$PM2_ECOSYSTEM"

echo "==> Setup complete."
echo "    App root: $APP_DIR"
echo "    Next: clone repo to $REPO_DIR, copy .env, run deploy/migrate-db.sh, then deploy/deploy.sh"
