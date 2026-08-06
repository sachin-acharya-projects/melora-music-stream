FROM python:3.12-slim

# Install system dependencies for yt-dlp (ffmpeg)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Environment variables
ENV PYTHONPATH=/app
ENV DOWNLOADS_DIR=/app/data/downloads
ENV CACHE_DIR=/app/data/cache
ENV MEDIA_DIR=/app/data/media
ENV DATABASE_URL=sqlite:////app/data/melora.db
ENV REDIS_URL=redis://redis:6379/0

# Ensure data, downloads, cache, and media directories exist
RUN mkdir -p /app/data /app/data/downloads /app/data/cache /app/data/media/avatars

# Command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
