# Stage Skill

Serve the app locally from the current worktree with a production database snapshot, optionally impersonating a user.

> ⚠️ **Template note.** Replace `<APP_NAME>` (used for the PID file path), `<BACKUPS_DIR>` (where you sync prod backups locally), and the default impersonation email below with your project's values.

## Usage

`/stage` — default: restore prod DB, impersonate as `<DEFAULT_USER_EMAIL>`, port 5173
`/stage for <email>` — impersonate as a different user
`/stage but don't impersonate` — skip impersonation (e.g. to test login flow)
`/stage port 5174` — use a custom port
`/stage for foo@example.com, port 5174, don't impersonate` — combine options

Parse `$ARGUMENTS` naturally. Defaults: user=`<DEFAULT_USER_EMAIL>`, port=5173, impersonate=true.

## Steps

1. **Kill any stale dev server.** Check `/tmp/<APP_NAME>-stage.pid`. If a process is running at that PID, kill it and remove the file. Also kill any orphaned vite processes from previous sessions (`pkill -f "vite dev"` if the PID file is stale).

2. **Determine the working directory.** If the current session is in a git worktree, use that worktree's paths. Otherwise use the main repo. All `app/` commands run from the worktree's `app/` directory.

3. **Ensure `.env` exists in the worktree.** If working in a worktree, check that `<worktree-root>/.env` exists. If not, copy it from the main repo. This file is required for the dev server to start properly.

4. **Ask the user:** "Overwrite local dev database (`app` on localhost:5432) with the latest production backup?" Wait for confirmation. If they decline, skip to step 7.

5. **Restore the production backup into the local dev database:**
   - Ensure the local Postgres container is running: `docker-compose up -d postgres` (from the repo root).
   - Find the latest `.dump` file: `ls -t <BACKUPS_DIR>/*.dump | head -1`
   - Terminate existing connections, then drop and recreate the local `app` database:
     ```
     docker-compose exec -T postgres psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'app' AND pid <> pg_backend_pid();"
     docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS app;"
     docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE app;"
     ```
   - Restore the backup:
     ```
     docker cp <BACKUPS_DIR>/LATEST_DUMP_FILENAME $(docker-compose ps -q postgres):/tmp/restore.dump
     docker-compose exec -T postgres pg_restore --no-owner --no-privileges -U postgres -d app /tmp/restore.dump
     ```

6. **Sync Drizzle migration tracking.** The production backup won't have Drizzle's migration journal. From the `app/` directory, run this Node script against the local DB:
   ```js
   const crypto = require('crypto');
   const fs = require('fs');
   const path = require('path');
   const pg = require('postgres');
   const sql = pg(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/app');
   (async () => {
     await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
     await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint not null)`;
     const journal = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
     const existing = new Set(journal.map(j => j.hash));
     const dir = path.resolve(process.cwd(), 'drizzle');
     const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
     let added = 0;
     for (const f of files) {
       const content = fs.readFileSync(path.join(dir, f), 'utf8');
       const hash = crypto.createHash('sha256').update(content).digest('hex');
       if (!existing.has(hash)) {
         await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, ${Date.now()})`;
         console.log('  Synced: ' + f);
         added++;
       }
     }
     console.log(added > 0 ? added + ' migrations synced' : 'Journal already in sync');
     await sql.end();
   })().catch(e => { console.error(e); process.exit(1); });
   ```
   Then run `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app npx drizzle-kit migrate` to apply any new migrations that exist on the branch but not yet in production.

7. **Start the dev server.** From the `app/` directory:
   ```
   pnpm dev --port <port>
   ```
   Run this in the background. **Wait for the "Local:" URL line to appear in the output** and parse the actual port from it — vite may pick a different port if the requested one is in use. Save the PID to `/tmp/<APP_NAME>-stage.pid`. Use the **actual port** from the output for all subsequent steps (impersonation URL, browser open).

8. **Impersonate (unless skipped).** Only generate one impersonation URL — do not retry or regenerate if earlier steps needed retries. If impersonation is enabled:
   - Look up the user in the **local** database:
     ```bash
     docker-compose exec -T postgres psql -U postgres -d app -t -A -c "SELECT id, name, email FROM \"user\" WHERE email = '<email>'"
     ```
   - If user not found, show an error and stop.
   - Generate a random password: `openssl rand -base64 9`
   - Run the impersonate script against the **local** database (not production):
     ```bash
     cd app && DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app APP_URL=http://localhost:<actual-port> npx tsx scripts/impersonate.ts --user-id <user-id> --password <password> --ttl 3600
     ```
   - Open the browser to the impersonation URL from the script output.
   - Show the user the password they need to enter.

9. **If impersonation is skipped**, just open `http://localhost:<actual-port>`.

10. If any step fails, show the error output and stop. Do not leave a half-started server — clean up the PID file if the server didn't start.

## Notes

- The dev server PID is tracked at `/tmp/<APP_NAME>-stage.pid` for cleanup.
- The `SessionEnd` hook in `.claude/settings.json` automatically kills the server on `/clear`, tab close, or Ctrl+C.
- `/ship` also kills the server as its first step.
- If a stale server is found at startup (from a crashed session), it's killed automatically.
