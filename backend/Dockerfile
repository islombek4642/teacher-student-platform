# --- Stage 1: Dependencies ---
FROM node:20-slim AS deps

WORKDIR /app

# bcrypt needs a native build toolchain in case no prebuilt binary matches the platform
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install

# --- Stage 2: Build ---
FROM deps AS build

WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm run build:seed

# --- Stage 3: Runtime ---
FROM node:20-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Tashkent

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# node:20-slim already ships a non-root "node" user (uid 1000) — reuse it
# instead of creating a new one to avoid a uid collision.
RUN chown -R node:node /app
USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/main.js"]
