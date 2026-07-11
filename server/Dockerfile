# Build from the repository root so both client/ and server/ are in context:
#   docker build -f server/Dockerfile -t mentoring-diaries .

# ── Stage 1: Build the React client ──────────────────────────────────────────
FROM node:20-alpine AS client-build

WORKDIR /build/client

COPY client/package*.json ./
# Full install (including devDependencies): vite and @vitejs/plugin-react are
# devDependencies and are required to run `npm run build`.
RUN npm ci

COPY client/ ./
RUN npm run build
# Output lands in /build/client/dist


# ── Stage 2: Production server ────────────────────────────────────────────────
FROM node:20-alpine AS server

WORKDIR /app

# Create the non-root user up front so all copied files can be owned by it.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install production dependencies first (cached layer, only rebuilt on package changes).
COPY server/package*.json ./
RUN npm ci --omit=dev

COPY --chown=appuser:appgroup server/ .

# Copy the compiled React app into ./public so Express static middleware can serve it.
COPY --from=client-build --chown=appuser:appgroup /build/client/dist ./public

# SQLite (WAL mode) and multer both need writable directories owned by the
# runtime user. Declaring them as volumes also persists data across container
# replacement instead of losing it with the image layer.
RUN mkdir -p /app/data /app/uploads && chown -R appuser:appgroup /app/data /app/uploads
VOLUME ["/app/data", "/app/uploads"]

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Run as a non-root user — good practice for container security.
USER appuser

CMD ["node", "index.js"]
