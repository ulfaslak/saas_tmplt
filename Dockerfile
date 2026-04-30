# Build a production image. Requires `app/pnpm-lock.yaml` to exist — run
# `cd app && pnpm install` once before the first `docker build` (locally or
# in CI) so the lockfile is committed and reproducible.

FROM node:20-slim AS base
RUN corepack enable

FROM base AS build
WORKDIR /app

COPY app/package.json app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY app/ ./
RUN pnpm build

FROM base AS production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm add drizzle-kit tsx

COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/src/lib/server/db/schema.ts ./src/lib/server/db/schema.ts

RUN mkdir -p /app/logs && chown node:node /app/logs

USER node
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "build"]
