# Stage 1: Build the React application
FROM node:24-slim AS build-frontend

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
ENV VITE_BASE_URL=""
RUN npm run build

# Stage 2: Final image combining Frontend and Backend
FROM python:3.12-slim

# Install system dependencies (nginx + ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend: Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend code
COPY backend/ /app/backend/

# Copy Frontend build from Stage 1
COPY --from=build-frontend /frontend/dist /usr/share/nginx/html

# Copy root Nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default

# Entrypoint script to run both uvicorn and nginx
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Environment variables
ENV PYTHONPATH=/app/backend
ENV DOWNLOADS_DIR=/app/data/downloads
ENV CACHE_DIR=/app/data/cache
ENV DATABASE_URL=sqlite:////app/data/melora.db
ENV REDIS_URL=redis://redis:6379/0

# Ensure data directory exists
RUN mkdir -p /app/data /app/data/downloads /app/data/cache

# Port mapping is handled in docker-compose.yml or at runtime
# EXPOSE is intentionally omitted
ENTRYPOINT ["/app/start.sh"]
