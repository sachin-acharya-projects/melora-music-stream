# Melora Backend

A modular FastAPI backend for searching, streaming, and downloading music from YouTube.

## Features

- **Search**: Search for songs on YouTube.
- **Stream**: Get audio streaming URLs for YouTube videos.
- **Download**: Download and convert YouTube videos to MP3 (192kbps).
- **Playlists**: Create and manage local playlists.
- **Import**: Import existing YouTube playlists.

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
    ```bash
    pip install -r requirements.txt
    ```

### Running the App

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8005
```

The API will be available at `http://localhost:8005`.

### Documentation

- Swagger UI: `http://localhost:8005/docs`
- ReDoc: `http://localhost:8005/redoc`
