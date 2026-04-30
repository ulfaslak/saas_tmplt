# Reset

Run these steps:

1. `docker-compose down -v && docker-compose up -d` — destroy and recreate the Postgres container with a clean volume
2. `cd app && pnpm drizzle-kit migrate` — apply all migrations
3. `cd app && pnpm migrate:sync` — sync the migration journal (worktree agents sometimes leave it out of sync)
4. Check if the latest migration needs manual application: compare the highest-numbered migration file in `app/drizzle/` against what's in the DB:
   ```bash
   docker compose exec -T postgres psql -U postgres -d app -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at"
   ```
   If any migration was journaled but not applied, pipe it in manually.
5. Confirm success:
   ```bash
   docker compose exec -T postgres psql -U postgres -d app -c "\dt"
   ```
   — should show all expected tables.

Report the result briefly.
