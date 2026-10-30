# Stage 1: Install production dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build tools for compiling packages if needed (e.g. bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Avoid downloading unnecessary Chromium binary during npm ci (saves bandwidth and prevents build timeouts)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install only production dependencies
RUN npm ci --only=production

# Stage 2: Final runtime container
FROM node:20-alpine

# Install Tesseract OCR and trained language models for receipt/expense processing
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-tam \
    tesseract-ocr-data-ara \
    tesseract-ocr-data-hin

WORKDIR /app

# Copy production node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy application source code
COPY index.js server.js ./
COPY src/ ./src
COPY public/ ./public

# Ensure uploads and public directories exist
RUN mkdir -p uploads public

# Expose backend API port
EXPOSE 5000

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=5000
ENV REQUIRE_REDIS_LOCK=true
ENV REQUIRE_REDIS_RATE_LIMIT=true
ENV REQUIRE_REDIS_ADAPTER=true
ENV TESSDATA_PREFIX=/usr/share/tessdata
ENV EXPENSE_OCR_PROVIDER=tesseract-local
ENV PERSONAL_EXPENSE_OCR_PROVIDER=tesseract-local

CMD ["node", "server.js"]
