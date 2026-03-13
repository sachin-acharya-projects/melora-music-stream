# Melora - Full-Stack YouTube Music Downloader

Melora is a **full-stack web application** for searching, streaming, and downloading YouTube music. It combines a **React + Vite frontend** with a **FastAPI backend**, providing a seamless user experience with persistent playback, smart queueing, and playlist management.

This README gives an **overview of the project**, how frontend and backend interact, and the overall development workflow. Detailed documentation for each part is in the respective directories:

- `frontend/README.md` – frontend-specific setup, scripts, and architecture
- `backend/README.md` – backend-specific API documentation, setup, and dependencies

---

## 🚀 Project Overview

### Frontend

- Built with **React + TypeScript** and **Vite**
- Persistent **global audio player** with smart queueing
- Playlist management with drag-and-drop reordering
- Dark/light theme support, responsive UI, and smooth animations
- All frontend-specific instructions and features are in `frontend/README.md`

### Backend

- Built with **FastAPI** and **Uvicorn**
- Provides APIs for:
    - Audio streaming (`/stream`)
    - YouTube search and playlist import (`/search`, `/import`)
    - Playlist and queue management (`/playlists`, `/queue`)

- Handles **audio extraction** and serves high-quality music to the frontend
- Backend-specific instructions are in `backend/README.md`

---

## 🏗 Architecture

```text
project/
├─ frontend/        # React/Vite application (UI + state management)
│  └─ README.md     # Frontend-specific documentation
├─ backend/         # FastAPI server (APIs + streaming logic)
│  └─ README.md     # Backend-specific documentation
├─ Makefile         # Dev commands for frontend + backend
├─ README.md        # This root-level project overview
└─ .gitignore
```

- The **frontend** communicates with the **backend API** via `VITE_BASE_URL`.
- Persistent state (player, queue, playlists) is managed **on the frontend**.
- Backend serves audio streams, playlists, and search results.

---

## 🛠 Development Workflow

The project includes a **Makefile at the root** for easy local development:

```bash
# Start frontend + backend simultaneously
make dev

# Start frontend only
make frontend

# Start backend only
make backend

# Build frontend for production
make build
```

> Frontend and backend have separate dependency management (`npm install` in `frontend`, `pip install -r requirements.txt` in `backend`).

---

## 🧩 Environment Variables

- **Frontend**: `.env` file in `frontend/`

    ```env
    VITE_BASE_URL=http://localhost:8000
    ```

- **Backend**: `.env` file in `backend/` (optional, e.g., PORT configuration)

---

## ✅ Getting Started

1. Clone the repository:

```bash
git clone <repo-url>
cd project
```

2. Install dependencies:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or venv\Scripts\activate # Windows
pip install -r requirements.txt
```

3. Start development servers:

```bash
make dev
```

4. Access the app at `http://localhost:5173` (default Vite port)

---

## 📌 Notes

- All frontend-specific architecture and scripts are in `frontend/README.md`
- All backend-specific API and streaming details are in `backend/README.md`
- Root README is only for **high-level project overview, structure, and dev workflow**

---

Built with ❤️ to bring YouTube music to your fingertips.
