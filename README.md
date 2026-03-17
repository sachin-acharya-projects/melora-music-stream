# Melora - Music Search & Streaming

Melora is a full-stack application built with FastAPI (Python) and React + Vite (TypeScript) for searching, streaming, and downloading music from YouTube.

## 🚀 Quick Start with Docker

The easiest way to run Melora is using Docker. We provide a **Unified Fullstack Image** that runs both the frontend and backend in a single container.

### 1. Build and Run (Fullstack)
```bash
# Build the unified image
make docker-build-fullstack

# Run the unified container (Defaults to port 80)
make docker-run-fullstack
```
Once running, you can access the app at `http://localhost`.

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
- `docker-compose.yml`: Orchestration for different deployment scenarios.
- `Makefile`: Convenient shortcuts for common tasks.

## 💾 Data Persistence
By default, Docker uses a volume named `melora_data` to persist your SQLite database and downloaded music files. This ensures your data survives container restarts and updates.
