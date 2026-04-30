# Development Setup (One-Time)

Instructions for initial project setup, infrastructure provisioning, and CI/CD configuration. Most agents will never need this file — it's for onboarding new developers, disaster recovery, or changing infra.

> ⚠️ **Template placeholder.** Throughout this file, replace `<APP_NAME>`, `<DOMAIN>`, `<HOST_IP>`, `<DEPLOY_USER>`, `<SSH_KEY_PATH>`, `<APP_DIR>`, `<DB_USER>`, `<DB_NAME>`, and `<GITHUB_OWNER>/<REPO>` with your actual values once you've decided on them.

## Provisioning with Terraform

The template ships a Terraform configuration in `terraform/` for provisioning a Hetzner Cloud VPS. Adapt to your provider as needed.

Prerequisites: [Terraform CLI](https://developer.hashicorp.com/terraform/install) and a [Hetzner Cloud API token](https://console.hetzner.cloud/projects) (project → Security → API Tokens → Generate).

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: set hcloud_token and ssh_public_key_path
terraform init
terraform plan
terraform apply
```

This creates a VPS with Docker pre-installed and a `deploy` user. Note the `server_ip` output — you'll need it for DNS.

## DNS

Create an A record: `<DOMAIN>` → the server IP from Terraform output.

## First deploy

SSH into the server and configure the environment:

```bash
ssh <DEPLOY_USER>@<HOST_IP>
cd <APP_DIR>
cp .env.production.example .env.production
# Edit .env.production with real values (DB creds, API keys, OAuth secrets)
```

Start the stack and run migrations:

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec app npx drizzle-kit migrate
```

Nginx will automatically obtain a Let's Encrypt certificate for `<DOMAIN>` on first HTTPS request. No manual SSL setup needed.

## Auth provider setup

The template wires up four sign-in providers, all conditionally registered. Configure only the ones you want available — leave the others unset and they won't appear on the login page.

### Google OAuth

1. [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client ID.
2. Add authorized redirect URIs:
   - Local: `http://localhost:5173/auth/callback/google`
   - Production: `https://<DOMAIN>/auth/callback/google`
3. Save `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env` and `.env.production`.

### Microsoft Entra ID

1. Azure Portal → App registrations → New registration. Set redirect URIs as above (substitute `microsoft-entra-id` in the path).
2. Save `AUTH_MICROSOFT_ENTRA_ID_ID` and `AUTH_MICROSOFT_ENTRA_ID_SECRET`.
3. The client secret expires — note the expiry date and add a [[DEFERRED]] entry to rotate before then.

### GitHub OAuth (login)

1. [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App.
2. Authorization callback URL: same pattern (`/auth/callback/github`).
3. Save `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`.
4. **This is for login only** — separate from any GitHub App you might create for product integrations.

### Resend (email magic links + transactional)

1. [resend.com](https://resend.com) → API Keys → Create.
2. Verify your sending domain.
3. Save `AUTH_RESEND_KEY`.

## GitHub Actions CI/CD

1. Generate an SSH key pair on the VPS:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys
```

2. Add these secrets to the GitHub repo (Settings > Secrets > Actions):
   - `VPS_HOST` — VPS IP or hostname
   - `VPS_USER` — `<DEPLOY_USER>`
   - `VPS_SSH_KEY` — contents of `~/.ssh/deploy_key` (private key)

GHCR authentication uses the built-in `GITHUB_TOKEN` — no extra secret needed. On every push to `main`, GitHub Actions builds the Docker image, pushes to GHCR, then SSHes into the VPS to pull and restart.

## Offsite backup sync

Backups are synced from the VPS to the local machine daily via `scripts/sync-backups.sh`. Adjust the paths in the script to match your `<APP_NAME>` and key path. The script rsyncs:

- `<APP_DIR>/backups/` — database dumps (`--delete` mirrors the 30-day retention)
- `<APP_DIR>/.env.production` — production environment variables
- `~/.ssh/github_deploy{,.pub}` — GitHub deploy key (for repo cloning on a new VPS)
- `~/.docker/config.json` — GHCR auth (for pulling the app image on a new VPS)

To set up the launchd agent for daily runs:

```bash
cp scripts/backup-sync.plist ~/Library/LaunchAgents/com.<APP_NAME>.backup-sync.plist
launchctl load ~/Library/LaunchAgents/com.<APP_NAME>.backup-sync.plist
```

To run manually: `./scripts/sync-backups.sh`
