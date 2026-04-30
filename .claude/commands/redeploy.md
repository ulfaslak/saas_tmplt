---
description: Disaster recovery — provision a fresh VPS and restore from backup
---

# Redeploy from backup

You are performing disaster recovery. The goal is to provision a fresh VPS, restore the database from the most recent offsite backup, and get the production stack running.

> ⚠️ **Template note.** Replace `<APP_NAME>`, `<DOMAIN>`, `<DEPLOY_USER>`, `<SSH_KEY_PATH>`, `<APP_DIR>`, `<DB_USER>`, `<DB_NAME>`, `<GITHUB_OWNER>/<REPO>`, and `<BACKUPS_DIR>` with your project's values.

Read `AGENTS/DNA/DEVELOPMENT.md` (the "Production deployment" and "Deployment knowledge" sections) before starting. The deployment knowledge section contains hard-won operational details — follow them exactly.

## Phase 1 — Provision (automated)

1. `cd terraform`
2. If replacing a dead VPS, run `terraform state rm hcloud_server.<APP_NAME>` to clear the old resource.
3. Run `terraform apply` — this creates a new VPS with Docker pre-installed and a `<DEPLOY_USER>` user.
4. Note the `server_ip` from the Terraform output.
5. Wait for cloud-init to finish: poll with `ssh -o StrictHostKeyChecking=accept-new <DEPLOY_USER>@<ip> cloud-init status --wait` (timeout after 5 minutes).

## Phase 2 — User tasks (tell the user, then continue to Phase 3)

Tell the user to do these in parallel while you continue with Phase 3:

1. **Update DNS**: Change the A record for `<DOMAIN>` to the new server IP.
2. **Update GitHub Actions secrets**: Set `VPS_HOST` to the new IP in the repo's Actions secrets.
3. **Add deploy key**: After you output the deploy key public key in Phase 3, add it as a deploy key to the `<GITHUB_OWNER>/<REPO>` GitHub repo (Settings > Deploy keys, read-only).

## Phase 3 — Configure VPS (automated, runs while user does Phase 2)

SSH into the new VPS as `<DEPLOY_USER>`:

1. **Generate GitHub deploy key**:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "<APP_NAME>-vps-deploy"
   ```
   Output the public key (`~/.ssh/github_deploy.pub`) and tell the user to add it as a deploy key (Phase 2 step 3).

2. **Clone the repo** (after user confirms deploy key is added):
   ```bash
   GIT_SSH_COMMAND="ssh -i ~/.ssh/github_deploy" git clone git@github.com:<GITHUB_OWNER>/<REPO>.git <APP_DIR>
   ```

3. **Set up GHCR auth**: Ask the user for a GitHub Personal Access Token with `read:packages` scope. Then:
   ```bash
   echo "<PAT>" | docker login ghcr.io -u <GITHUB_OWNER> --password-stdin
   ```

4. **Upload `.env.production`**: Copy from the local backup at `<BACKUPS_DIR>/.env.production` (the user should keep a copy there), or from the repo's `.env.production.example` and fill in values interactively.

5. **Generate CI/CD SSH key**:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N "" -C "<APP_NAME>-cicd"
   cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
   ```
   Output the **private key** (`~/.ssh/deploy_key`) content so the user can update the `VPS_SSH_KEY` GitHub Actions secret.

## Phase 4 — Restore database (automated)

1. Find the most recent `.dump` file in `<BACKUPS_DIR>/` on the local machine. If none exist, ask the user.
2. Upload the backup to the VPS:
   ```bash
   scp -i <SSH_KEY_PATH> <backup_file> <DEPLOY_USER>@<ip>:<APP_DIR>/backups/
   ```
3. Start only Postgres:
   ```bash
   cd <APP_DIR> && docker compose -f docker-compose.prod.yml up -d postgres
   ```
4. Wait for Postgres healthy, then restore:
   ```bash
   docker compose -f docker-compose.prod.yml exec -T postgres \
     pg_restore -U <DB_USER> -d <DB_NAME> --clean --if-exists --no-owner < backups/<backup_file>
   ```

## Phase 5 — Start and verify (automated)

1. Pull and start the full stack:
   ```bash
   cd <APP_DIR>
   docker compose -f docker-compose.prod.yml pull app
   docker compose -f docker-compose.prod.yml up -d
   ```
2. Run migrations in case the backup predates recent schema changes:
   ```bash
   docker compose -f docker-compose.prod.yml exec app npx drizzle-kit migrate
   ```
3. Health check — curl localhost:3000 from within the VPS (via the app container or directly).
4. SSL check — `curl -sI https://<DOMAIN>` (may fail if DNS hasn't propagated yet; that's okay, note it for the user).

## Phase 6 — Report

Summarize:
- New VPS IP
- Whether DB restore succeeded
- Whether the app is responding
- Whether SSL is working (or pending DNS propagation)

Remaining manual steps for the user:
- If the domain changed: update OAuth redirect URLs for each enabled auth provider (see DEVELOPMENT_SETUP.md).
- Update `VPS_SSH_KEY` GitHub Actions secret with the CI/CD private key output from Phase 3.
- Verify GitHub Actions CI/CD works by pushing a trivial commit.
