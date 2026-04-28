# ── Stage 1: Build React ─────────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /app/client

# Build-time env vars untuk Vite (VITE_* di-bake ke bundle)
ARG VITE_POCKETBASE_URL
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL

COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Production server ──────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy React build output ke public/
COPY --from=client-build /app/client/dist ./public

# Copy server source (tsx run langsung)
COPY server/src ./src
COPY server/tsconfig.json ./

RUN npm install -g tsx

ENV PORT=3000
EXPOSE 3000

CMD ["tsx", "src/index.ts"]
