# Melora - Music Search & Streaming

Melora is a full-stack application built with FastAPI (Python) and React + Vite (TypeScript) for searching, streaming, and downloading music from YouTube.

## 🚀 Quick Start with Docker

The easiest way to run Melora is using Docker. We provide a **Unified Fullstack Image** that runs both the frontend and backend in a single container.

### 1. Build and Run (Fullstack)
```bash
# Build the unified image
make docker-build-fullstack

# Run the unified container (binds $PORT on the host, defaults to 80)
make docker-run-fullstack
```
Once running, you can access the app at `http://localhost:${PORT}` (`PORT` comes from `.env`, default 8000).

### 2. Available Endpoints
- **Frontend**: `http://localhost/`
- **API v1**: `http://localhost/api/v1`
- **Interactive Docs**: `http://localhost/docs`
- **Database Admin**: `http://localhost/admin`

### 3. Custom Configuration (Environment Variables)
You can customize the host-side ports and debug mode using environment variables:

```bash
# Run on a different port (e.g., 8080) in Debug mode
PORT=8080 DEBUG=true make docker-run-fullstack
```

## 🛠️ Development Setup

### Local Installation
```bash
# Install all dependencies (Frontend + Backend)
make install
```

### Run Locally (without Docker)
```bash
# Start both frontend and backend
make dev
```

### Docker Modular Setup (Backend Only)
If you only want to run or deploy the backend:
```bash
# Build backend image
make docker-build-backend

# Run backend (Defaults to port 8000)
make docker-run-backend

# With custom port
BACKEND_PORT=9000 make docker-run-backend
```

## 📂 Project Structure
- `backend/`: FastAPI application code.
- `frontend/`: React + Vite application code.
- `nginx.conf`: Nginx configuration for the unified full-stack image.
- `docker-compose.yml`: Local development / quick-start orchestration (publishes host ports).
- `docker-compose.prod.yml`: Production deployment file used by CI (`scripts/melora-deploy`).
- `Makefile`: Convenient shortcuts for common tasks.

## 💾 Data Persistence
By default, Docker uses a volume named `melora_data` to persist your SQLite database and downloaded music files. This ensures your data survives container restarts and updates.

## 🛡️ Admin Dashboard

Users with the `admin` role get a dedicated area at `/admin` (visible from the user menu) to manage the catalog and accounts:

- **Dashboard** – global metrics: catalog size, published/hidden/featured counts, users, and play activity.
- **Artists** – search/filter/sort the full catalog (including hidden artists), import single artists from YouTube, batch-import artists (names, channel IDs, or channel URLs), edit metadata, feature, publish/hide, and delete.
- **Songs** – browse the catalog, import a song from a YouTube ID/URL, import a full YouTube playlist into the catalog, edit titles/uploaders/thumbnails, feature, publish/hide, and delete.
- **Users** – search accounts, grant/revoke the `admin` role, and activate/deactivate accounts (you cannot demote or deactivate yourself).

Only content marked **published** is shown to regular users on browse/search/discover/recommendations. Hidden items remain in the library (e.g. playable in existing playlists) but are excluded from all user-facing discovery surfaces. Artist/song imports are admin-only; database browsing is available to admins at `/admin` (sqladmin) on the backend.
