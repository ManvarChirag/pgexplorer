# syntax=docker/dockerfile:1

FROM node:20-slim

WORKDIR /app

# Default to production behavior (secure cookies, etc.)
ENV NODE_ENV=production

# Install dependencies first for better layer caching
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy source
COPY . ./

# Ensure the uploads dir exists (server also creates it, but this keeps permissions tidy)
RUN mkdir -p /app/uploads \
  && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "server.js"]
