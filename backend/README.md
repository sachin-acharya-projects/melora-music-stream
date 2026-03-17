# Melora Backend

A modular FastAPI backend for searching, streaming, and downloading music from YouTube.

## Features

- **Search**: Search for songs on YouTube.
- **Stream**: Get audio streaming URLs for YouTube videos.
- **Download**: Download and convert YouTube videos to MP3 (192kbps).
- **Playlists**: Create and manage local playlists.
- **Import**: Import existing YouTube playlists.
- **Admin**: Integrated database admin panel at `/admin`.

## Directory Structure

```text
app/
├── api/             # API routes and router aggregation
├── core/            # Centralized settings and database setup
├── db/              # ORM models and database dependencies
├── schemas/         # Pydantic models for request/response validation
├── services/        # Business logic (YouTube interactions, etc.)
└── main.py          # FastAPI entry point
```

## Setup & Running

### Prerequisites

- Python 3.12+
- `ffmpeg` installed on your system (for audio conversion)

### Installation

1. Clone the repository.
2. Create and activate a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```
3. Install dependencies:

**Option A: Using pyproject.toml (Recommended)**
```bash
# For Production
pip install .

# For Development (Includes Ruff and other dev tools)
pip install -e ".[dev]"
```

**Option B: Using requirements.txt (Legacy)**
```bash
pip install -r requirements.txt
```

### Running the App

```bash
# Standard run
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Debug mode (verbose logs and detailed errors)
DEBUG=true uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

### Development Tools

- **Linting & Formatting**: Powered by `ruff`.
    ```bash
    # Check for errors
    ruff check .
    # Format code
    ruff format .
    ```

### Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Database Admin: `http://localhost:8000/admin`
