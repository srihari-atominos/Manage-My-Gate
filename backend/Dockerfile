# Stage 1: Install production dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Stage 2: Final runtime container
FROM node:20-alpine

WORKDIR /app

# Copy production node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source code
COPY index.js server.js ./
COPY src/ ./src
COPY public/ ./public

# Expose backend API port
EXPOSE 5000

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
