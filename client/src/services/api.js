/**
 * Central API service — all calls to the Flask backend go through here.
 * Base URL: http://localhost:5001
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// ── token helpers ─────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('ns_token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

// ── generic fetch wrapper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: authHeaders(),
    ...options,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: text };
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (payload) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (payload) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),

  me: () => apiFetch('/api/auth/me'),

  /** Get Google OAuth redirect URL from backend, then navigate there */
  loginWithGoogle: async () => {
    const data = await apiFetch('/api/auth/google');
    if (data.url) window.location.href = data.url;
    else throw new Error(data.error || 'Google OAuth not available');
  },

  /** Get GitHub OAuth redirect URL from backend, then navigate there */
  loginWithGitHub: async () => {
    const data = await apiFetch('/api/auth/github');
    if (data.url) window.location.href = data.url;
    else throw new Error(data.error || 'GitHub OAuth not available');
  },
};

// ── NEWS ──────────────────────────────────────────────────────────────────────
export const newsApi = {
  /** All news from DB, optional category filter */
  getFeed: (category = 'all', limit = 20) =>
    apiFetch(`/api/news/feed?category=${encodeURIComponent(category)}&limit=${limit}`),

  /** LIVE news directly from GNews API — always fresh */
  getLiveNews: (category = 'general', limit = 20) =>
    apiFetch(`/api/news/live?category=${encodeURIComponent(category)}&limit=${limit}`),

  /** Personalised recommendations for logged-in user */
  getRecommendations: (limit = 10) =>
    apiFetch(`/api/news/recommendations?limit=${limit}`),

  /** Trending (most-clicked) news */
  getTrending: (limit = 10) =>
    apiFetch(`/api/news/trending?limit=${limit}`),

  /** Full-text search in DB */
  search: (q, limit = 20) =>
    apiFetch(`/api/news/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  /** Record a user click — used for recommendation feedback */
  recordClick: (news_id) =>
    apiFetch('/api/news/click', { method: 'POST', body: JSON.stringify({ news_id }) }),

  /** Available categories */
  getCategories: () => apiFetch('/api/news/categories'),
};

// ── BOOKMARKS ─────────────────────────────────────────────────────────────────
export const bookmarkApi = {
  getCollections: () => apiFetch('/api/bookmarks/collections'),

  createCollection: (name, icon = '📁') =>
    apiFetch('/api/bookmarks/collections', {
      method: 'POST', body: JSON.stringify({ name, icon }),
    }),

  deleteCollection: (collection_id) =>
    apiFetch(`/api/bookmarks/collections/${collection_id}`, { method: 'DELETE' }),

  getBookmarks: (collection_id = null) =>
    apiFetch(`/api/bookmarks${collection_id ? `?collection_id=${collection_id}` : ''}`),

  addBookmark: (collection_id, article) =>
    apiFetch('/api/bookmarks', {
      method: 'POST', body: JSON.stringify({ collection_id, article }),
    }),

  removeBookmark: (bookmark_id) =>
    apiFetch(`/api/bookmarks/${bookmark_id}`, { method: 'DELETE' }),

  checkBookmark: (news_id) =>
    apiFetch(`/api/bookmarks/check/${encodeURIComponent(news_id)}`),
};
export const userApi = {
  getStats:       ()           => apiFetch('/api/user/stats'),
  getHistory:     (limit = 50) => apiFetch(`/api/user/history?limit=${limit}`),
  getAnalytics:   ()           => apiFetch('/api/user/analytics'),
  getProfile:     ()           => apiFetch('/api/user/profile'),
  updateProfile:  (data)       => apiFetch('/api/user/profile', { method: 'PUT',  body: JSON.stringify(data) }),
  changePassword: (data)       => apiFetch('/api/user/change-password', { method: 'POST', body: JSON.stringify(data) }),
};

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  fetchNews: (query = 'technology', max_results = 10) =>
    apiFetch('/api/admin/fetch-news', {
      method: 'POST',
      body: JSON.stringify({ query, max_results }),
    }),
};

// ── UTILS ─────────────────────────────────────────────────────────────────────

/**
 * Returns a reliable image URL for an article.
 * Priority: article's own image_url → Picsum fallback keyed by news_id
 */
export function resolveImage(article) {
  if (article.image_url && article.image_url.startsWith('http')) {
    return article.image_url;
  }
  // deterministic fallback using the news_id seed
  const seed = encodeURIComponent(article.news_id || article.title || 'news');
  return `https://picsum.photos/seed/${seed}/600/340`;
}

/**
 * Format an ISO date string into a friendly "X time ago" label.
 */
export function timeAgo(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date)) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Returns the primary category label for display.
 */
export function primaryLabel(article) {
  const labels = article.top_3_labels || article.predicted_labels || [];
  return labels[0] || 'General';
}
