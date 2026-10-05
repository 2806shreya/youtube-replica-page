const express = require('express');
const cors = require('cors');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const port = Number(process.env.PORT || 3000);
const dataPath = process.env.DATA_FILE || path.join(__dirname, 'data', 'store.json');
const seedPath = path.join(__dirname, 'data', 'seed.json');

app.use(cors());
app.use(express.json());

async function ensureDataFile() {
  try {
    await fs.access(dataPath);
  } catch {
    const seed = await fs.readFile(seedPath, 'utf8');
    await fs.writeFile(dataPath, seed, 'utf8');
  }
}

async function readStore() {
  await ensureDataFile();
  const raw = await fs.readFile(dataPath, 'utf8');
  return JSON.parse(raw);
}

async function writeStore(store) {
  await fs.writeFile(dataPath, JSON.stringify(store, null, 2), 'utf8');
}

function matches(video, query) {
  const needle = query.toLowerCase();
  return `${video.title} ${video.channel} ${video.description}`.toLowerCase().includes(needle);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/videos', async (_req, res) => {
  const store = await readStore();
  res.json({ videos: store.videos, subscribed: store.subscribed, source: 'api' });
});

app.get('/api/videos/:id', async (req, res) => {
  const store = await readStore();
  const video = store.videos.find((item) => item.id === req.params.id);

  if (!video) {
    return res.status(404).json({ message: 'Video not found' });
  }

  return res.json({ video, source: 'api' });
});

app.get('/api/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  const store = await readStore();
  const videos = query ? store.videos.filter((video) => matches(video, query)) : store.videos;
  res.json({ videos, source: 'api' });
});

app.post('/api/videos/:id/like', async (req, res) => {
  const store = await readStore();
  const video = store.videos.find((item) => item.id === req.params.id);

  if (!video) {
    return res.status(404).json({ message: 'Video not found' });
  }

  video.liked = !video.liked;
  video.likes += video.liked ? 1 : -1;
  await writeStore(store);
  return res.json({ video, source: 'api' });
});

app.get('/api/subscription', async (_req, res) => {
  const store = await readStore();
  res.json({ subscribed: store.subscribed, source: 'api' });
});

app.post('/api/subscription', async (_req, res) => {
  const store = await readStore();
  store.subscribed = !store.subscribed;
  await writeStore(store);
  res.json({ subscribed: store.subscribed, source: 'api' });
});

app.get('/api/videos/:id/comments', async (req, res) => {
  const store = await readStore();
  const videoExists = store.videos.some((video) => video.id === req.params.id);
  if (!videoExists) {
    return res.status(404).json({ message: 'Video not found' });
  }
  const comments = store.comments[req.params.id] || [];
  return res.json({ comments, source: 'api' });
});

app.post('/api/videos/:id/comments', async (req, res) => {
  const author = String(req.body.author || '').trim();
  const text = String(req.body.text || '').trim();

  if (!author || !text) {
    return res.status(400).json({ message: 'author and text are required' });
  }
  if (author.length > 30 || text.length > 220) {
    return res.status(400).json({ message: 'author or text exceeds allowed length' });
  }

  const store = await readStore();
  const videoExists = store.videos.some((video) => video.id === req.params.id);
  if (!videoExists) {
    return res.status(404).json({ message: 'Video not found' });
  }
  if (!store.comments[req.params.id]) {
    store.comments[req.params.id] = [];
  }

  const comment = {
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: new Date().toISOString()
  };

  store.comments[req.params.id].unshift(comment);
  await writeStore(store);

  return res.status(201).json({ comment, source: 'api' });
});

app.delete('/api/videos/:id/comments/:commentId', async (req, res) => {
  const store = await readStore();
  const videoExists = store.videos.some((video) => video.id === req.params.id);
  if (!videoExists) {
    return res.status(404).json({ message: 'Video not found' });
  }
  const comments = store.comments[req.params.id] || [];
  store.comments[req.params.id] = comments.filter((comment) => comment.id !== req.params.commentId);
  await writeStore(store);

  return res.json({ success: true, source: 'api' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`SRM Stream API running at http://localhost:${port}`);
});
