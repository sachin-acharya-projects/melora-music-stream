# Stage 1: Build the React application
FROM node:24-slim AS build-frontend

RUN npm install -g pnpm@11.17.0

WORKDIR /app/frontend

# Keep the workspace root off the filesystem top level: with the member at
# ../libs/bug-reporter, a root like /frontend makes pnpm 11.17.0 silently skip
# the entire install (tsc ends up missing). /app/frontend + /app/libs avoids it.
# Also copy store packages instead of hard-linking (overlay2-safe) and never
# auto-(re)install inside `pnpm build`.
ENV npm_config_package_import_method=copy
ENV npm_config_verify_deps_before_run=false
ENV NODE_ENV=development

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
COPY libs/ /app/libs/
RUN pnpm install --frozen-lockfile
COPY frontend/ .
ENV VITE_BASE_URL=""
ARG VITE_ENABLE_BUGREPORTER=true
ENV VITE_ENABLE_BUGREPORTER=$VITE_ENABLE_BUGREPORTER
RUN pnpm build

# Stage 2: Final image combining Frontend and Backend
FROM python:3.12-slim

# Install uv and system dependencies (nginx + ffmpeg for yt-dlp)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Backend: Install dependencies from the lockfile
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy Backend code
COPY backend/ /app/backend/

# Copy Frontend build from Stage 1
COPY --from=build-frontend /app/frontend/dist /usr/share/nginx/html

# Copy root Nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default

# Entrypoint script to run both uvicorn and nginx
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Environment variables
ENV PATH="/app/backend/.venv/bin:$PATH"
ENV PYTHONPATH=/app/backend
ENV DOWNLOADS_DIR=/app/data/downloads
ENV CACHE_DIR=/app/data/cache
ENV MEDIA_DIR=/app/data/media
ENV LOGS_DIR=/app/data/logs
ENV DATABASE_URL=postgresql+psycopg://melora:melora@db:5432/melora
ENV REDIS_URL=redis://redis:6379/0

# Ensure data directory exists
RUN mkdir -p /app/data /app/data/downloads /app/data/cache /app/data/media/avatars /app/data/logs

# Port mapping is handled in docker-compose.yml or at runtime
# EXPOSE is intentionally omitted as per user request
ENTRYPOINT ["/app/start.sh"]
