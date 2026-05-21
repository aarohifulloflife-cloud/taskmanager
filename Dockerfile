# Multi-stage-friendly, small production image.
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies for a lean image
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src ./src
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Container-level health check used by Docker and the Deploy stage
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
