import { demoData } from './demo-data.js';

const API_BASE = (window.YT_API_BASE || 'http://localhost:3000/api').replace(/\/$/, '');
const STORAGE_KEY = 'srm-stream-store-v1';
let backendAvailable;

const clone = (value) => JSON.parse(JSON.stringify(value));

function loadStore() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  const initial = clone(demoData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

async function detectBackend() {
  if (backendAvailable !== undefined) {
    return backendAvailable;
  }

  try {
    const response = await fetch(`${API_BASE}/health`, { method: 'GET' });
    backendAvailable = response.ok;
  } catch {
    backendAvailable = false;
  }

  return backendAvailable;
}

async function withBackend(backendCall, fallbackCall) {
  const available = await detectBackend();

  if (available) {
    try {
      return await backendCall();
    } catch {
      backendAvailable = false;
    }
  }

  return fallbackCall();
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

export async function getInitialData() {
  return withBackend(
    async () => request('/videos'),
    () => {
      const store = loadStore();
      return { videos: store.videos, subscribed: store.subscribed, source: 'fallback' };
    }
  );
}

export async function searchVideos(query) {
  return withBackend(
    async () => request(`/search?q=${encodeURIComponent(query)}`),
    () => {
      const store = loadStore();
      const needle = query.trim().toLowerCase();
      const videos = !needle
        ? store.videos
        : store.videos.filter((video) =>
            `${video.title} ${video.channel} ${video.description}`.toLowerCase().includes(needle)
          );

      return { videos, source: 'fallback' };
    }
  );
}

export async function toggleLike(videoId) {
  return withBackend(
    async () => request(`/videos/${videoId}/like`, { method: 'POST' }),
    () => {
      const store = loadStore();
      const video = store.videos.find((item) => item.id === videoId);
      if (!video) {
        throw new Error('Video not found');
      }
      video.liked = !video.liked;
      video.likes += video.liked ? 1 : -1;
      saveStore(store);
      return { video, source: 'fallback' };
    }
  );
}

export async function toggleSubscription() {
  return withBackend(
    async () => request('/subscription', { method: 'POST' }),
    () => {
      const store = loadStore();
      store.subscribed = !store.subscribed;
      saveStore(store);
      return { subscribed: store.subscribed, source: 'fallback' };
    }
  );
}

export async function getComments(videoId) {
  return withBackend(
    async () => request(`/videos/${videoId}/comments`),
    () => {
      const store = loadStore();
      const comments = store.comments[videoId] || [];
      return { comments, source: 'fallback' };
    }
  );
}

export async function addComment(videoId, author, text) {
  return withBackend(
    async () =>
      request(`/videos/${videoId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ author, text })
      }),
    () => {
      const store = loadStore();
      if (!store.comments[videoId]) {
        store.comments[videoId] = [];
      }

      const comment = {
        id: crypto.randomUUID(),
        author,
        text,
        createdAt: new Date().toISOString()
      };

      store.comments[videoId].unshift(comment);
      saveStore(store);

      return { comment, source: 'fallback' };
    }
  );
}

export async function deleteComment(videoId, commentId) {
  return withBackend(
    async () => request(`/videos/${videoId}/comments/${commentId}`, { method: 'DELETE' }),
    () => {
      const store = loadStore();
      if (!store.comments[videoId]) {
        return { success: true, source: 'fallback' };
      }

      store.comments[videoId] = store.comments[videoId].filter((comment) => comment.id !== commentId);
      saveStore(store);
      return { success: true, source: 'fallback' };
    }
  );
}
