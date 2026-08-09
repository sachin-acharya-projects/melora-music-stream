FROM python:3.12-slim

# Install uv and system dependencies for yt-dlp (ffmpeg)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend dependencies from the lockfile
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy backend code
COPY . .

# Environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH=/app
ENV DOWNLOADS_DIR=/app/data/downloads
ENV CACHE_DIR=/app/data/cache
ENV MEDIA_DIR=/app/data/media
ENV LOGS_DIR=/app/data/logs
ENV DATABASE_URL=sqlite:////app/data/melora.db
ENV REDIS_URL=redis://redis:6379/0

# Ensure data, downloads, cache, media, and logs directories exist
RUN mkdir -p /app/data /app/data/downloads /app/data/cache /app/data/media/avatars /app/data/logs

# Command to run the application (migrations run automatically on startup)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
