import {
  addComment,
  deleteComment,
  getComments,
  getInitialData,
  searchVideos,
  toggleLike,
  toggleSubscription
} from './api.js';
import { state } from './state.js';

const dom = {
  body: document.body,
  menuToggle: document.getElementById('menu-toggle'),
  sideNav: document.getElementById('side-nav'),
  themeToggle: document.getElementById('theme-toggle'),
  statusMessage: document.getElementById('status-message'),
  searchForm: document.getElementById('search-form'),
  searchInput: document.getElementById('search-input'),
  videoImage: document.getElementById('video-image'),
  videoTitle: document.getElementById('video-title'),
  videoMeta: document.getElementById('video-meta'),
  videoDescription: document.getElementById('video-description'),
  likeBtn: document.getElementById('like-btn'),
  subscribeBtn: document.getElementById('subscribe-btn'),
  subscriberCopy: document.getElementById('subscriber-copy'),
  suggestedVideos: document.getElementById('suggested-videos'),
  cards: document.getElementById('video-cards'),
  cardsEmpty: document.getElementById('cards-empty'),
  commentsList: document.getElementById('comments-list'),
  commentsEmpty: document.getElementById('comments-empty'),
  commentForm: document.getElementById('comment-form')
};

const THEME_KEY = 'srm-stream-theme';

function formatViews(views) {
  return `${new Intl.NumberFormat('en-US').format(views)} views`;
}

function formatRelativeDate(isoDate) {
  const diffMinutes = Math.max(1, Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

function setStatus(message) {
  dom.statusMessage.textContent = message;
}

function findVideo(videoId) {
  return state.videos.find((video) => video.id === videoId);
}

function selectedVideo() {
  return findVideo(state.selectedVideoId) || state.videos[0];
}

function renderVideoDetail() {
  const video = selectedVideo();
  if (!video) {
    setStatus('No videos available right now.');
    return;
  }

  state.selectedVideoId = video.id;
  dom.videoImage.src = video.image;
  dom.videoImage.alt = `${video.title} thumbnail`;
  dom.videoTitle.textContent = video.title;
  dom.videoMeta.textContent = `${formatViews(video.views)} • ${video.uploadedAt} • ${video.channel}`;
  dom.videoDescription.textContent = video.description;
  dom.likeBtn.textContent = `👍 ${video.liked ? 'Liked' : 'Like'} (${new Intl.NumberFormat('en-US').format(video.likes)})`;
  dom.likeBtn.setAttribute('aria-pressed', String(video.liked));
}

function renderCards(videos) {
  dom.cards.replaceChildren();

  if (!videos.length) {
    dom.cardsEmpty.hidden = false;
    return;
  }

  dom.cardsEmpty.hidden = true;

  videos.forEach((video) => {
    const button = document.createElement('button');
    button.className = 'video-card';
    button.type = 'button';
    button.dataset.videoId = video.id;
    const image = document.createElement('img');
    image.src = video.image;
    image.alt = `${video.title} thumbnail`;

    const details = document.createElement('span');
    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = video.title;

    const channel = document.createElement('span');
    channel.className = 'card-meta';
    channel.textContent = video.channel;

    const meta = document.createElement('span');
    meta.className = 'card-meta';
    meta.textContent = `${formatViews(video.views)} • ${video.uploadedAt}`;

    details.append(title, channel, meta);
    button.append(image, details);
    dom.cards.appendChild(button);
  });
}

function renderSuggested() {
  const selectedId = state.selectedVideoId;
  const suggestions = state.videos.filter((video) => video.id !== selectedId).slice(0, 4);
  dom.suggestedVideos.replaceChildren();

  suggestions.forEach((video) => {
    const button = document.createElement('button');
    button.className = 'suggested-video';
    button.type = 'button';
    button.dataset.videoId = video.id;
    const image = document.createElement('img');
    image.src = video.image;
    image.alt = `${video.title} thumbnail`;

    const details = document.createElement('span');
    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = video.title;

    const channel = document.createElement('span');
    channel.className = 'card-meta';
    channel.textContent = video.channel;

    details.append(title, channel);
    button.append(image, details);
    dom.suggestedVideos.appendChild(button);
  });
}

function renderSubscription() {
  dom.subscribeBtn.textContent = state.subscribed ? 'Subscribed' : 'Subscribe';
  dom.subscribeBtn.setAttribute('aria-pressed', String(state.subscribed));
  dom.subscriberCopy.textContent = state.subscribed
    ? 'You are subscribed for SRM updates.'
    : 'Campus stories and student life';
}

function renderComments() {
  dom.commentsList.replaceChildren();

  if (!state.comments.length) {
    dom.commentsEmpty.hidden = false;
    return;
  }

  dom.commentsEmpty.hidden = true;

  state.comments.forEach((comment) => {
    const item = document.createElement('li');
    item.className = 'comment-item';
    const head = document.createElement('div');
    head.className = 'comment-head';

    const author = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = comment.author;
    author.appendChild(strong);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'comment-delete';
    deleteButton.dataset.commentId = comment.id;
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', `Delete comment by ${comment.author}`);
    deleteButton.textContent = 'Delete';

    head.append(author, deleteButton);

    const body = document.createElement('p');
    body.textContent = comment.text;

    const time = document.createElement('p');
    time.className = 'comment-time';
    time.textContent = formatRelativeDate(comment.createdAt);

    item.append(head, body, time);
    dom.commentsList.appendChild(item);
  });
}

async function loadComments(videoId) {
  const { comments } = await getComments(videoId);
  state.comments = comments;
  renderComments();
}

async function selectVideo(videoId) {
  state.selectedVideoId = videoId;
  renderVideoDetail();
  renderSuggested();
  await loadComments(videoId);
}

async function initializeData() {
  setStatus('Loading videos...');
  try {
    const { videos, subscribed, source } = await getInitialData();
    state.videos = videos;
    state.filteredVideos = videos;
    state.selectedVideoId = videos[0]?.id || null;
    state.subscribed = subscribed;

    renderVideoDetail();
    renderCards(state.filteredVideos);
    renderSuggested();
    renderSubscription();
    if (state.selectedVideoId) {
      await loadComments(state.selectedVideoId);
    }

    setStatus(source === 'fallback' ? 'Using demo/local data mode.' : 'Connected to local API backend.');
  } catch (error) {
    setStatus(`Unable to load data: ${error.message}`);
  }
}

function wireEvents() {
  dom.menuToggle.addEventListener('click', () => {
    const open = dom.sideNav.classList.toggle('open');
    dom.menuToggle.setAttribute('aria-expanded', String(open));
  });

  dom.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    dom.body.dataset.theme = state.theme;
    localStorage.setItem(THEME_KEY, state.theme);
    dom.themeToggle.textContent = state.theme === 'dark' ? '🌙' : '☀️';
  });

  dom.searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const query = dom.searchInput.value.trim();
      state.searchQuery = query;
      const { videos } = await searchVideos(query);
      state.filteredVideos = videos;
      renderCards(videos);
      setStatus(videos.length ? `Showing ${videos.length} result(s).` : 'No videos match your search.');
    } catch (error) {
      setStatus(`Search failed: ${error.message}`);
    }
  });

  dom.cards.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-video-id]');
    if (!target) {
      return;
    }
    await selectVideo(target.dataset.videoId);
  });

  dom.suggestedVideos.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-video-id]');
    if (!target) {
      return;
    }
    await selectVideo(target.dataset.videoId);
  });

  dom.likeBtn.addEventListener('click', async () => {
    if (!state.selectedVideoId) {
      return;
    }

    try {
      const { video } = await toggleLike(state.selectedVideoId);
      const current = findVideo(video.id);
      if (current) {
        current.liked = video.liked;
        current.likes = video.likes;
      }
      renderVideoDetail();
    } catch (error) {
      setStatus(`Unable to update like: ${error.message}`);
    }
  });

  dom.subscribeBtn.addEventListener('click', async () => {
    try {
      const { subscribed } = await toggleSubscription();
      state.subscribed = subscribed;
      renderSubscription();
    } catch (error) {
      setStatus(`Unable to update subscription: ${error.message}`);
    }
  });

  dom.commentForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(dom.commentForm);
    const author = String(formData.get('author') || '').trim();
    const text = String(formData.get('text') || '').trim();

    if (!author || !text || !state.selectedVideoId) {
      setStatus('Name and comment are required.');
      return;
    }

    try {
      await addComment(state.selectedVideoId, author, text);
      dom.commentForm.reset();
      await loadComments(state.selectedVideoId);
      setStatus('Comment posted.');
    } catch (error) {
      setStatus(`Unable to post comment: ${error.message}`);
    }
  });

  dom.commentsList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-comment-id]');
    if (!button || !state.selectedVideoId) {
      return;
    }

    try {
      await deleteComment(state.selectedVideoId, button.dataset.commentId);
      await loadComments(state.selectedVideoId);
      setStatus('Comment deleted.');
    } catch (error) {
      setStatus(`Unable to delete comment: ${error.message}`);
    }
  });
}

function initializeTheme() {
  state.theme = localStorage.getItem(THEME_KEY) || 'dark';
  dom.body.dataset.theme = state.theme;
  dom.themeToggle.textContent = state.theme === 'dark' ? '🌙' : '☀️';
}

export async function initializeApp() {
  initializeTheme();
  wireEvents();
  await initializeData();
}
