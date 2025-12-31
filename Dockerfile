
# syntax=docker/dockerfile:1.7
############################
# Base
############################
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Enable corepack and configure pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://rbitly:rbitly@localhost:5432/rbitly?schema=public

############################
# Dependencies (prod + build)
############################
FROM base AS deps
# Install OS deps if needed (openssl for prisma engines, ca-certs, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy only files needed to install deps
COPY package.json pnpm-lock.yaml ./

# Use cache mount for pnpm store to speed up repeated builds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

############################
# Build
############################
FROM deps AS build
COPY tsconfig.json tsdown.config.ts ./
COPY src ./src
COPY prisma ./prisma
COPY public ./public
COPY postcss.config.cjs ./
COPY prisma.config.ts ./
COPY src/interfaces/http/web/assets ./src/interfaces/http/web/assets
# Generate prisma client (if you use prisma generate in your workflow)
RUN export DATABASE_URL=$DATABASE_URL pnpm prisma generate
# Build CSS + app bundle
RUN pnpm run css:build
RUN pnpm run build

############################
# Runtime (small, non-root)
############################
FROM base AS runtime
# Install OS deps required at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy node_modules from deps but prune to production
COPY --from=deps /app/node_modules /app/node_modules
COPY package.json pnpm-lock.yaml ./
# Prune dev deps (keeps runtime small)
RUN pnpm prune --prod

# Copy built artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/interfaces/http/web/templates/ ./src/interfaces/http/web/templates/

# Create non-root user and set ownership AFTER copying files
RUN useradd -m -u 10001 appuser && \
  chown -R appuser:appuser /app

# Switch to non-root
USER appuser

# Default env
ENV PORT=3000
EXPOSE 3000

# Healthcheck (expects /health to exist)
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT||3000) + '/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.cjs"]
