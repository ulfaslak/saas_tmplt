#!/bin/bash
# Sync production backups from VPS to local machine.
# Mirrors the 30-day retention policy (--delete removes files
# that no longer exist on the VPS).
#
# Required env vars (export from your shell or pass inline):
#   VPS_HOST    — DNS name or IP of the VPS
#   VPS_USER    — SSH user, e.g. "deploy"
#   SSH_KEY     — path to the private key used to reach the VPS
#   APP_NAME    — used for the remote app dir (~/<APP_NAME>) and local mirror (~/<APP_NAME>-backups)

set -euo pipefail

: "${VPS_HOST:?VPS_HOST not set}"
: "${VPS_USER:?VPS_USER not set}"
: "${SSH_KEY:?SSH_KEY not set}"
: "${APP_NAME:?APP_NAME not set}"

REMOTE_PATH="~/${APP_NAME}/backups/"
LOCAL_PATH="$HOME/${APP_NAME}-backups/"

mkdir -p "$LOCAL_PATH"

SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new"

# Sync database backups
rsync -avz --delete \
  --exclude='.ssh' --exclude='.docker' --exclude='.env.production' \
  -e "$SSH_CMD" \
  "${VPS_USER}@${VPS_HOST}:${REMOTE_PATH}" \
  "$LOCAL_PATH"

# Sync .env.production
rsync -avz \
  -e "$SSH_CMD" \
  "${VPS_USER}@${VPS_HOST}:~/${APP_NAME}/.env.production" \
  "$LOCAL_PATH"

# Sync VPS credentials needed for DR (deploy key, GHCR auth)
mkdir -p "$LOCAL_PATH/.ssh" "$LOCAL_PATH/.docker"
rsync -avz \
  -e "$SSH_CMD" \
  "${VPS_USER}@${VPS_HOST}:~/.ssh/github_deploy" \
  "$LOCAL_PATH/.ssh/"
rsync -avz \
  -e "$SSH_CMD" \
  "${VPS_USER}@${VPS_HOST}:~/.ssh/github_deploy.pub" \
  "$LOCAL_PATH/.ssh/"
rsync -avz \
  -e "$SSH_CMD" \
  "${VPS_USER}@${VPS_HOST}:~/.docker/config.json" \
  "$LOCAL_PATH/.docker/"

echo "Backup sync complete: $(ls "$LOCAL_PATH" | wc -l | tr -d ' ') files in $LOCAL_PATH"
