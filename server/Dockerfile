# Build from the repository root so both client/ and server/ are in context:
#   docker build -f server/Dockerfile -t mentoring-diaries .

# ── Stage 1: Build the React client ──────────────────────────────────────────
FROM node:20-alpine AS client-build

WORKDIR /build/client

COPY client/package*.json ./
RUN npm ci --omit=dev

COPY client/ ./
RUN npm run build
# Output lands in /build/client/dist


# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine AS server

WORKDIR /app

# Install production dependencies first (cached layer, only rebuilt on package changes).
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/ .

# Copy the compiled React app into ./public so Express static middleware can serve it.
COPY --from=client-build /build/client/dist ./public

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Run as a non-root user — good practice for container security.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["node", "index.js"]
