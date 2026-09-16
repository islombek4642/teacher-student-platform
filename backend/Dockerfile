# --- Stage 1: Dependencies ---
FROM node:20-slim AS deps

WORKDIR /app

# bcrypt needs a native build toolchain in case no prebuilt binary matches the platform
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: Build ---
FROM deps AS build

WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Stage 3: Runtime ---
FROM node:20-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Tashkent

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd -m -u 1000 appuser

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

RUN chown -R appuser:appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/main.js"]
