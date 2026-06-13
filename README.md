# UnderCut

Unofficial Formula 1 data companion — live timing, championship standings, driver and constructor profiles, and historical archives.

**Production:** [https://undercut.ge](https://undercut.ge)

## Quick start

```bash
pnpm install
cp .env.example .env
cp .env.example apps/web/.env.local   # add DATABASE_URL for Prisma
pnpm db:up                            # local Postgres + Redis (Docker)
pnpm db:push
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web app (and ws-server) in development |
| `pnpm build --filter=web` | Production build of the Next.js app |
| `pnpm typecheck` | Type-check all packages |
| `pnpm sync:latest` | Incremental sync of current season race data |
| `pnpm db:backup` | Create a PostgreSQL dump in `packages/db/backups/` |

## Deployment

See [DEPLOY.md](./DEPLOY.md) for Vercel and [deploy/README.md](./deploy/README.md) for VPS setup on `23.88.46.52` (`undercut.ge`).

## Monorepo layout

- `apps/web` — Next.js 16 web app
- `apps/desktop` — Electron desktop shell
- `packages/db` — Prisma schema and sync scripts
- `services/ws-server` — Live timing WebSocket server
- `services/ingestion` — Live data ingestion workers

Internal package scope remains `@pitwall/*` (rename deferred).
