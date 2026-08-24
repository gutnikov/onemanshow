# syntax=docker/dockerfile:1

# Build stage. Nothing from here reaches the runtime image except two
# directories of output, which is what keeps the artifact small enough for a
# free registry tier.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts ./
COPY shared ./shared
COPY api ./api
COPY db ./db
COPY web ./web
RUN npm run build:web && npm run build:api

# Runtime stage. No node_modules, no toolchain, no source: the API is a single
# bundled file, and db/migrations is present because the readiness check reads
# the migration journal to decide whether the schema is current.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/db/migrations ./db/migrations
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
