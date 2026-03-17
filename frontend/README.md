# Melora - YouTube Music Downloader

A modern, high-end web application for searching, streaming, and downloading YouTube music. Melora offers a polished user interface with seamless transitions, persistent state, and powerful playlist management.

## 🚀 Features

### 🎵 Core Experience

- **Global Audio Player**: Persistent playback across all pages. Music never stops while you navigate.
- **Smart Queueing**: Automatically creates queues based on your current view (Search, Playlist, or Queue).
- **Now Playing Section**: A dedicated, full-screen immersive view with transport controls, volume management, and an interactive "Up Next" queue.
- **High-Quality Streaming**: Instant streaming using backend-powered audio extraction.
- **One-Click Downloads**: Download any song directly as high-quality audio.

### 📂 Music Management

- **Playlist System**: Create, rename, and manage custom playlists.
- **YouTube Integration**: Import entire YouTube playlists directly into Melora.
- **Flexible Layouts**: Toggle between Grid and List views. Your preference is remembered across sessions.
- **Sorting & Reordering**:
    - Sort by Ascending/Descending (persisted and URL-synced).
    - Manual drag-and-drop reordering with dedicated handles.
    - Cross-page reordering support via "Show All" mode.
- **Bulk Actions**: Multi-select songs to play, queue, or add to playlists in one go.

### ✨ UX & UI

- **Modern Dark Mode**: Refined dark aesthetic with high contrast and smooth transitions.
- **Themed Components**: Custom confirmation dialogs, dropdowns, and toggles that match the app's vibe.
- **Fluid Animations**: Powered by `framer-motion` for a premium feel, including smooth expanding transitions.
- **SEO Friendly**: Dynamic page titles that reflect current playback and navigation.
- **Responsive Design**: Works perfectly on mobile and desktop.

## 🛠 Tech Stack

- **Frontend**: React 19 (TypeScript), Vite, Tailwind CSS
- **State Management**: Zustand (with LocalStorage Persistence)
- **Data Fetching**: TanStack Query v5 (React Query)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: React Toastify
- **Routing**: React Router DOM v7

## 🏗 Project Architecture

### Component Pattern

All components follow a strict structural standard for better discoverability and maintainability:

- **Structure**: `src/components/component-name/component-name.tsx`
- **Naming**: Folder/File use `kebab-case`, JSX exports use `PascalCase`.
- **Logic**: Styles are kept in-line using Tailwind CSS, while complex state logic is extracted into custom hooks.

### State Management

- **`usePlayerStore`**: Manages the global audio state, current playlist, indices, volume, and playback controls.
- **`useQueueStore`**: Manages the download queue, including bulk additions and reordering.
- **`useThemeStore`**: Persists user preferences for dark/light mode, grid/list layouts, and sort orders.

### Data Fetching

- **React Query**: Used for all API interactions (`/search`, `/playlists`, `/stream`, `/import`) to provide robust caching, loading states, and automatic synchronization across components.

## 🚦 Getting Started

### Prerequisites

- Node.js (v24+)
- Backend API running at `http://localhost:8000` (configurable in `.env`)

### Installation

1. Clone the repository.
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file:
    ```env
    VITE_BASE_URL=http://localhost:8000
    ```
4. Start the development server:
    ```bash
    npm run dev
    ```

## 📜 Available Scripts

- `npm run dev`: Starts development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Runs ESLint to check for code quality and strict typing.
- `npm run preview`: Previews the production build locally.

---

Built with ❤️ for music lovers.
