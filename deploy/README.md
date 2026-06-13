# UnderCut — VPS deployment (`undercut.ge`)

Deploy the Next.js app to **23.88.46.52** with PostgreSQL. This guide assumes Ubuntu 22.04+ and SSH access.

> **Never run `db:seed` or a full historical sync on production.** Restore the existing backup once, then use `pnpm sync:latest` for incremental race updates only.

## Prerequisites (manual)

1. **DNS** — A record: `undercut.ge` → `23.88.46.52` (and `www.undercut.ge` if desired).
2. **SSH key** — Add your public key to the server (`~/.ssh/authorized_keys`).
3. **SSL** — After nginx is running, obtain a certificate (e.g. `certbot --nginx -d undercut.ge -d www.undercut.ge`).

## One-time server setup

On your laptop, copy the setup script and run it on the server:

```bash
scp deploy/setup-server.sh user@23.88.46.52:/tmp/
ssh user@23.88.46.52 'sudo bash /tmp/setup-server.sh'
```

This installs Node 20, pnpm, PostgreSQL client tools, nginx, and creates `/opt/undercut` with a `deploy` user layout.

## Copy database backup

From the monorepo root (backup already at `packages/db/backups/pitwall_20260613_214832.sql.gz`):

```bash
scp packages/db/backups/pitwall_20260613_214832.sql.gz user@23.88.46.52:/opt/undercut/backups/
```

## Environment file on server

Create `/opt/undercut/.env` (see `deploy/.env.production.example`):

```env
NEXT_PUBLIC_SITE_URL=https://undercut.ge
CURRENT_SEASON=2026
DATABASE_URL=postgresql://undercut:CHANGE_ME@localhost:5432/undercut
NODE_ENV=production
PORT=3000
```

Also copy to `/opt/undercut/apps/web/.env.local` with at least `DATABASE_URL`.

## First deploy

```bash
# Clone on server (or use deploy.sh from CI)
ssh user@23.88.46.52
sudo -u undercut git clone git@github.com:absolodev/undercut.ge.git /opt/undercut/app
cd /opt/undercut/app
sudo -u undercut cp /opt/undercut/.env .env
sudo -u undercut cp /opt/undercut/.env apps/web/.env.local

# Restore DB (first time only)
sudo -u undercut bash deploy/migrate-db.sh /opt/undercut/backups/pitwall_20260613_214832.sql.gz

# Build and start
sudo -u undercut bash deploy/deploy.sh
```

## Subsequent deploys

```bash
ssh user@23.88.46.52 'cd /opt/undercut/app && sudo -u undercut bash deploy/deploy.sh'
```

Optional flags:

```bash
deploy/deploy.sh --restore-db /opt/undercut/backups/latest.sql.gz   # restore from backup
deploy/deploy.sh --skip-build                                        # restart only
```

## nginx + SSL

```bash
sudo cp /opt/undercut/app/deploy/nginx-undercut.ge.conf /etc/nginx/sites-available/undercut.ge
sudo ln -sf /etc/nginx/sites-available/undercut.ge /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d undercut.ge -d www.undercut.ge
```

## Docker alternative

For Postgres/Redis on the same host:

```bash
cd /opt/undercut/app
docker compose -f deploy/docker-compose.prod.yml up -d postgres redis
```

Then point `DATABASE_URL` at the compose Postgres service and run migrate + deploy as above.

## GitHub Actions sync

Add repository secret `DATABASE_URL` (production PostgreSQL). The `sync-race-data` workflow runs `pnpm sync:latest` only — incremental updates after races, **not** a full seed.
