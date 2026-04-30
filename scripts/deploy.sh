#!/bin/bash
# Zero-downtime deploy.
#
# nginx uses Docker's internal DNS (127.0.0.11, valid=5s) with
# variable-based proxy_pass, so it re-resolves "app" per-request.
#
# Strategy:
# 1. Start a canary container with the "app" network alias
# 2. Wait for it to be healthy (nginx auto-discovers it via DNS)
# 3. Recreate the Compose app container with the new image
# 4. Wait for it to be healthy
# 5. Remove the canary
#
# No nginx restart needed — DNS handles the transitions.
#
# Required env vars:
#   APP_NAME — used for the canary container name and `<APP_NAME>_default` network
#   IMAGE_REPO — full GHCR repo path, e.g. ghcr.io/owner/repo

set -euo pipefail

COMMIT_SHA="${1:?Usage: deploy.sh <commit-sha>}"
APP_NAME="${APP_NAME:?APP_NAME env var required}"
IMAGE_REPO="${IMAGE_REPO:?IMAGE_REPO env var required, e.g. ghcr.io/owner/repo}"
IMAGE="${IMAGE_REPO}:${COMMIT_SHA}"

cd "$HOME/$APP_NAME"
COMPOSE="docker compose -f docker-compose.prod.yml"

# Pull the exact image for this commit
echo "Pulling ${IMAGE}..."
docker pull "$IMAGE"

# Check if image actually changed
CURRENT_IMAGE=$(docker inspect --format='{{.Image}}' "$($COMPOSE ps -q app)" 2>/dev/null || echo "")
NEW_IMAGE=$(docker image inspect "$IMAGE" --format='{{.Id}}')

if [ "$CURRENT_IMAGE" = "$NEW_IMAGE" ]; then
  echo "Image unchanged, nothing to deploy."
  exit 0
fi

# Start canary with the "app" network alias so nginx routes to it via DNS
echo "Starting canary container..."
CANARY=$(docker run -d \
  --name "${APP_NAME}-app-canary" \
  --network "${APP_NAME}_default" \
  --network-alias app \
  --env-file .env.production \
  -v "$(pwd)/logs:/app/logs" \
  --health-cmd "node -e \"fetch('http://localhost:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\"" \
  --health-interval 5s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 15s \
  "$IMAGE")

echo "Canary: ${CANARY:0:12}"

# Wait for canary to be healthy
echo "Waiting for canary to be healthy..."
TRIES=0
MAX_TRIES=12
while [ $TRIES -lt $MAX_TRIES ]; do
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CANARY" 2>/dev/null || echo "unknown")
  if [ "$HEALTH" = "healthy" ]; then
    echo "Canary is healthy"
    break
  fi
  TRIES=$((TRIES + 1))
  if [ $TRIES -eq $MAX_TRIES ]; then
    echo "ERROR: Canary failed to become healthy (status: $HEALTH)"
    docker stop "$CANARY" && docker rm "$CANARY"
    exit 1
  fi
  sleep 5
done

# Tag as latest so docker-compose.prod.yml (which references :latest) picks it up
docker tag "$IMAGE" "${IMAGE_REPO}:latest"

# Recreate the Compose app container — canary handles traffic during this window
echo "Recreating app container..."
$COMPOSE up -d --no-deps --force-recreate app

# Wait for new app container to be healthy
echo "Waiting for new app container..."
NEW_APP=$($COMPOSE ps -q app)
TRIES=0
while [ $TRIES -lt $MAX_TRIES ]; do
  HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$NEW_APP" 2>/dev/null || echo "unknown")
  if [ "$HEALTH" = "healthy" ]; then
    echo "New app container is healthy"
    break
  fi
  TRIES=$((TRIES + 1))
  if [ $TRIES -eq $MAX_TRIES ]; then
    echo "WARNING: New container slow to start, proceeding"
    break
  fi
  sleep 5
done

# Remove canary — DNS will stop returning its IP within 5s
echo "Removing canary..."
docker stop "$CANARY" && docker rm "$CANARY"

# Clean up old images. Each deploy tags <IMAGE_REPO>:<commit-sha>, so previous
# images are never "dangling" (they keep their SHA tag). Plain `prune -f` only
# removes dangling images and has no effect here, which can let old images fill
# the disk. Use `-a` to include unreferenced tagged images, and `until=48h` to
# retain the last couple of deploys for quick rollback.
docker image prune -a -f --filter "until=48h"

echo "Deploy complete"
