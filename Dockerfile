FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies (uses package-lock.json)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Run as the non-root user that ships with the node image
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
