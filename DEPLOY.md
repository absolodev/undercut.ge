# UnderCut Deployment Guide

**Production domain:** [https://undercut.ge](https://undercut.ge)  
**VPS:** `23.88.46.52` — see [deploy/README.md](./deploy/README.md) for full VPS instructions.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (local via Docker or hosted)
- Redis (optional, for live timing features)

## Environment variables

Set these in Vercel, on the VPS (`/opt/undercut/.env`), or in the monorepo root `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CURRENT_SEASON` | Yes | Active F1 year (e.g. `2026`) |
| `NEXT_PUBLIC_SITE_URL` | Yes (prod) | Canonical URL: `https://undercut.ge` |
| `REDIS_URL` | No | Redis for live session data |
| `JOLPICA_API_BASE` | No | Override Jolpica API base URL for sync |

Production template:

```env
NEXT_PUBLIC_SITE_URL=https://undercut.ge
CURRENT_SEASON=2026
DATABASE_URL=postgresql://undercut:...@localhost:5432/undercut
```

## Build

From the monorepo root:

```bash
pnpm install
pnpm build
```

This runs Turbo and builds `apps/web` (Next.js 16 App Router).

To build only the web app:

```bash
pnpm build --filter=web
```

## Local production test

```bash
pnpm --filter web build
pnpm --filter web start
```

## Vercel

1. Import the GitHub repository (`git@github.com:absolodev/undercut.ge.git`).
2. Set **Root Directory** to `apps/web` (or use root with `vercel.json` in `apps/web`).
3. `apps/web/vercel.json` configures install/build from monorepo root.
4. Add environment variables in the Vercel dashboard.
5. Deploy.

Georgian visitors are redirected to `/ka/` on first visit (via `x-vercel-ip-country`).

## VPS (23.88.46.52)

See [deploy/README.md](./deploy/README.md) for:

- `deploy/setup-server.sh` — nginx, Node, PM2
- `deploy/migrate-db.sh` — restore from `packages/db/backups/*.sql.gz` (**not** full seed)
- `deploy/deploy.sh` — pull, build, restart

```bash
scp packages/db/backups/*.sql.gz user@23.88.46.52:/opt/undercut/backups/
ssh user@23.88.46.52 'cd /opt/undercut/app && bash deploy/migrate-db.sh /opt/undercut/backups/pitwall_20260613_214832.sql.gz'
```

## Database sync (CI / manual)

**Incremental only** — updates race results for the current season after each grand prix:

```bash
pnpm sync:latest      # sync current season (incremental)
pnpm sync:season 2025 # sync a specific season
```

> **Do not run `pnpm db:seed` on production.** Restore the existing backup once, then use `sync:latest` for ongoing updates.

For GitHub Actions, add `DATABASE_URL` as a repository secret. The workflow runs `pnpm sync:latest` only:

```yaml
- run: pnpm sync:latest
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    CURRENT_SEASON: "2026"
```

## Docker (database only — local dev)

```bash
pnpm db:up    # starts Postgres + Redis via infra/docker-compose.yml
pnpm db:push
# db:seed is for local dev only — never on production
```

## Post-deploy checks

- `https://undercut.ge/en/` — home dashboard
- `https://undercut.ge/sitemap.xml` — localized sitemap
- `https://undercut.ge/robots.txt`
- `https://undercut.ge/llms.txt`
- `https://undercut.ge/es/f1/drivers/norris` — localized driver page with hreflang

## i18n routing

- URLs use locale prefixes: `/en/`, `/es/`, `/ka/`
- `/` redirects to detected locale (Georgian IP → `/ka/`)
- Language switcher updates the URL path (indexable by search engines)
