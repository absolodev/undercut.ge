# @pitwall/db

Prisma schema, seed scripts, and database utilities for UnderCut.

## Backup

Create a timestamped PostgreSQL dump in `backups/` (gitignored):

```bash
chmod +x packages/db/scripts/backup-db.sh
pnpm --filter @pitwall/db db:backup
```

Requires `DATABASE_URL` and `pg_dump` on PATH. Loads `apps/web/.env.local` if present.

## Sync latest race data

After each race weekend, pull new results from Jolpica and enrich session details:

```bash
# Sync current season (default from CURRENT_SEASON env)
pnpm sync:latest

# Sync a specific season
pnpm sync:season -- 2025
```

This runs `packages/db/prisma/sync-latest.ts` which:
1. Upserts race + qualifying results from Jolpica/Ergast API
2. Seeds pit stops, laps, stints for completed rounds
3. Recomputes championship standings

### Scheduled sync

- **Cron (production):** run `pnpm sync:latest` daily or after each race (e.g. `0 3 * * 1` Monday 03:00 UTC)
- **GitHub Actions:** see `.github/workflows/sync-race-data.yml` (manual + weekly schedule)
- **Docker:** add a sidecar cron container calling the same script
