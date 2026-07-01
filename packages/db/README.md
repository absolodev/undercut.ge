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
1. Upserts the full season calendar from Jolpica (scheduled + completed rounds)
2. Upserts race + qualifying results from Jolpica/Ergast API
3. Seeds pit stops, laps, stints for completed rounds
4. Recomputes championship standings

### Scheduled sync

- **Cron (production):** `packages/db/scripts/sync-latest-cron.sh` — hourly Fri–Mon UTC during race weekends, plus daily 18:00 UTC Sun
- **GitHub Actions:** see `.github/workflows/sync-race-data.yml` (requires `DATABASE_URL` secret; manual + weekly Monday 04:00 UTC)
- **Docker:** add a sidecar cron container calling the same script
