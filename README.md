# SRM Stream (YouTube Replica MVP)

A polished, responsive SRM-focused YouTube-style project built with static HTML/CSS/JS and an optional local Express API.

## Architecture

- **Frontend (GitHub Pages compatible):** `index.html`, `style.css`, `script.js`, `js/*`
- **Backend (local/dev deploy):** `backend/server.js` + JSON file persistence in `backend/data/store.json`
- **Fallback mode:** if API is unavailable, frontend uses demo + `localStorage` so GitHub Pages still works.

## Features

- Responsive layout for desktop/tablet/mobile
- Accessible controls, semantic sections, keyboard focus states
- Search/filter videos
- Video detail view updates from cards and suggested videos
- Like/unlike toggle
- Subscribe/unsubscribe toggle
- Add/delete comments for the current session
- Theme toggle (saved in localStorage)
- Mobile nav toggle
- Loading, empty, and error-aware UI messaging

## Run locally

### 1) Frontend only (fallback mode)
Open `index.html` using any static server (for example VS Code Live Server). The app works immediately from demo/localStorage data.

### 2) Backend API (optional but recommended for full-stack demo)
```bash
npm install
npm start
```
API server runs on `http://localhost:3000` by default.

Environment options (`.env.example`):
- `PORT` (default `3000`)
- `DATA_FILE` (default `backend/data/store.json`)

## API routes

- `GET /api/health`
- `GET /api/videos`
- `GET /api/videos/:id`
- `GET /api/search?q=<term>`
- `POST /api/videos/:id/like`
- `GET /api/subscription`
- `POST /api/subscription`
- `GET /api/videos/:id/comments`
- `POST /api/videos/:id/comments` body: `{ "author": "...", "text": "..." }`
- `DELETE /api/videos/:id/comments/:commentId`

## Data model (JSON)

```json
{
  "subscribed": false,
  "videos": [
    {
      "id": "string",
      "title": "string",
      "channel": "string",
      "views": 0,
      "uploadedAt": "string",
      "likes": 0,
      "liked": false,
      "description": "string",
      "image": "images/..."
    }
  ],
  "comments": {
    "video-id": [
      {
        "id": "string",
        "author": "string",
        "text": "string",
        "createdAt": "ISO date"
      }
    ]
  }
}
```

## GitHub Pages deployment note

GitHub Pages hosts only static frontend files. It cannot host the Node.js API process or writable JSON storage.

- Pages deployment: frontend works in fallback mode (demo/localStorage)
- Full stack deployment: host backend separately (e.g., Render, Railway, Fly.io, VPS) and set `window.YT_API_BASE` to your backend URL.

All image paths use repository-relative `images/...` forward-slash paths for GitHub Pages/Linux compatibility.
