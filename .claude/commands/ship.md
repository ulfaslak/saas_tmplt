# Ship Skill

> ⚠️ **Template note.** Replace `<APP_NAME>`, `<HOST_IP>`, `<DEPLOY_USER>`, `<SSH_KEY_PATH>`, and `<APP_DIR>` placeholders with your project's values. The skill assumes you have an issue tracker — adapt step 2/3 if you use a tool other than Linear.

1. **Kill any running stage server** (unless the user says otherwise). Check `/tmp/<APP_NAME>-stage.pid` — if a process is running at that PID, kill it and remove the file.
2. Verify the issue-tracker MCP token is valid by listing recent issues
3. Create an issue with title and description from the current branch changes
4. Create a PR linking to the issue
5. Wait for CI, then merge the PR
6. If the issue-tracker token is expired, warn the user immediately and still create the PR
7. After merge, wait for the GitHub Action to deploy. If the change includes new or altered migration files (`app/drizzle/*.sql`), run migrations on production:
   ```bash
   ssh -i <SSH_KEY_PATH> <DEPLOY_USER>@<HOST_IP> "cd <APP_DIR> && docker compose -f docker-compose.prod.yml exec -T app npx drizzle-kit migrate"
   ```
   If drizzle-kit fails, apply the SQL directly via psql.
8. Verify the deployment works — hit relevant endpoints with `curl` against `https://<DOMAIN>`, check logs with `docker compose -f docker-compose.prod.yml logs --tail=20 app`, and for DB changes confirm tables/columns exist.
9. Check `AGENTS/POST_MERGE_VERIFICATION.md` for entries this PR authored. For each, if the trigger condition is satisfied now, run the Steps and clear the entry (or fix forward on failure). If not yet triggered, leave it — future sessions in this area will pick it up. Briefly tell the human which entries you ran, which you deferred, and why.
