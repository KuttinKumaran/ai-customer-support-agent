# =============================================================================
# AI Customer Support Agent — Production Docker image
# Multi-stage build: install deps in builder, run minimal image in production
# =============================================================================

# --- Stage 1: Install production dependencies ---
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json ./

# Install production dependencies only (no devDependencies)
RUN npm install --omit=dev && npm cache clean --force

# --- Stage 2: Production runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root user
RUN addgroup -g 1001 nodejs && adduser -S nodejs -u 1001 -G nodejs

ENV NODE_ENV=production
ENV PORT=3000

# Copy dependencies and application source
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY data ./data
COPY mock-servers ./mock-servers
COPY scripts ./scripts

# Ensure log directory exists and is writable
RUN mkdir -p src/logs && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check using Node.js native fetch (Node 18+)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
