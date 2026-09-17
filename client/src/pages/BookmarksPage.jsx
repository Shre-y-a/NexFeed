import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, ArrowUpDown, Trash2, ExternalLink,
  Wifi, X, Check, Loader, FolderPlus, Share2
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { bookmarkApi, resolveImage, timeAgo, primaryLabel } from '../services/api';
import './BookmarksPage.css';

const DEFAULT_ICONS = ['📚', '⏱', '🤖', '⚙️', '📈', '🔬', '🎯', '🌍', '💡', '🗂️'];

export default function BookmarksPage() {
  const [collections,      setCollections]     = useState([]);
  const [activeCol,        setActiveCol]        = useState(null); // null = all
  const [bookmarks,        setBookmarks]        = useState([]);
  const [searchQ,          setSearchQ]          = useState('');
  const [sortBy,           setSortBy]           = useState('newest');
  const [loading,          setLoading]          = useState(true);
  const [showNewColModal,  setShowNewColModal]  = useState(false);
  const [sharedCount,      setSharedCount]      = useState(0);

  // ── load collections ────────────────────────────────────────────────────
  const loadCollections = useCallback(async () => {
    try {
      const data = await bookmarkApi.getCollections();
      setCollections(data.collections || []);
    } catch (e) { console.error(e); }
  }, []);

  // ── load bookmarks ──────────────────────────────────────────────────────
  const loadBookmarks = useCallback(async (colId) => {
    setLoading(true);
    try {
      const data = await bookmarkApi.getBookmarks(colId || null);
      setBookmarks(data.bookmarks || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadCollections();
    loadBookmarks(null);
  }, [loadCollections, loadBookmarks]);

  const handleColClick = (colId) => {
    setActiveCol(colId);
    loadBookmarks(colId);
  };

  const handleDelete = async (bookmark_id) => {
    try {
      await bookmarkApi.removeBookmark(bookmark_id);
      setBookmarks(prev => prev.filter(b => b.bookmark_id !== bookmark_id));
      loadCollections(); // refresh counts
    } catch (e) { console.error(e); }
  };

  const handleShare = (article) => {
    const url = article.url || window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      setSharedCount(c => c + 1);
    });
  };

  const handleDeleteCollection = async (col_id) => {
    if (!window.confirm('Delete this collection and all its bookmarks?')) return;
    try {
      await bookmarkApi.deleteCollection(col_id);
      if (activeCol === col_id) { setActiveCol(null); loadBookmarks(null); }
      loadCollections();
    } catch (e) { console.error(e); }
  };

  // ── filter + sort ───────────────────────────────────────────────────────
  const visible = bookmarks
    .filter(b => !searchQ || b.title?.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.saved_at) - new Date(a.saved_at);
      if (sortBy === 'oldest') return new Date(a.saved_at) - new Date(b.saved_at);
      return (a.title || '').localeCompare(b.title || '');
    });

  const totalCount  = bookmarks.length;
  const unreadCount = bookmarks.filter(b => !b._read).length;

  return (
    <AppLayout>
      <div className="bookmarks-page">

        {/* ── Library sidebar ── */}
        <aside className="library-sidebar">
          <div className="library-header">
            <span className="library-title">LIBRARY</span>
            <button className="icon-btn" aria-label="New collection" onClick={() => setShowNewColModal(true)}>
              <Plus size={15} />
            </button>
          </div>

          {/* All Bookmarks */}
          <button
            className={`library-item ${activeCol === null ? 'active' : ''}`}
            onClick={() => handleColClick(null)}
          >
            <span className="library-item-icon">🔖</span>
            <span className="library-item-label">All Bookmarks</span>
            <span className="library-item-count">{totalCount}</span>
          </button>

          {/* User collections */}
          <div className="library-lists">
            {collections.map(col => (
              <div key={col.collection_id} className={`library-item-row ${activeCol === col.collection_id ? 'active' : ''}`}>
                <button
                  className="library-item-btn"
                  onClick={() => handleColClick(col.collection_id)}
                >
                  <span className="library-item-icon">{col.icon}</span>
                  <span className="library-item-label">{col.name}</span>
                  <span className="library-item-count">{col.count}</span>
                </button>
                <button
                  className="col-delete-btn"
                  aria-label="Delete collection"
                  onClick={() => handleDeleteCollection(col.collection_id)}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>

          {collections.length === 0 && (
            <p className="no-collections-hint">
              No collections yet.{' '}
              <button className="text-link" onClick={() => setShowNewColModal(true)}>Create one</button>
            </p>
          )}

          <div className="cloud-sync">
            <Wifi size={16} color="#4f6ef7" />
            <div>
              <div className="cloud-sync-title">Cloud Sync</div>
              <div className="cloud-sync-sub">Saved to your account</div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="bookmarks-main">
          <div className="bookmarks-header">
            <div>
              <h1 className="section-title">Bookmarks</h1>
              <p className="section-subtitle">Organize and manage your curated reading collection.</p>
            </div>
            <div className="bookmarks-toolbar">
              <div className="search-wrap-small">
                <Search size={13} className="search-icon-small" />
                <input
                  type="text"
                  placeholder="Search in library..."
                  className="input-field search-input-small"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                />
              </div>
              <button
                className="icon-btn"
                aria-label="Sort"
                onClick={() => setSortBy(s => s === 'newest' ? 'oldest' : s === 'oldest' ? 'az' : 'newest')}
                title={`Sort: ${sortBy}`}
              >
                <ArrowUpDown size={15} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="bookmark-stats">
            <div className="bookmark-stat-card">
              <div className="stat-icon">🔖</div>
              <div>
                <div className="stat-number">{totalCount}</div>
                <div className="stat-label">TOTAL SAVED</div>
              </div>
            </div>
            <div className="bookmark-stat-card">
              <div className="stat-icon purple">⏱</div>
              <div>
                <div className="stat-number">{unreadCount}</div>
                <div className="stat-label">UNREAD ARTICLES</div>
              </div>
            </div>
            <div className="bookmark-stat-card">
              <div className="stat-icon teal">↗</div>
              <div>
                <div className="stat-number">{sharedCount}</div>
                <div className="stat-label">SHARED TODAY</div>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="bm-loading">
              <Loader size={20} className="spin-icon" />
              <span>Loading bookmarks…</span>
            </div>
          )}

          {/* Empty */}
          {!loading && visible.length === 0 && (
            <div className="bm-empty">
              <p style={{ fontSize: 36 }}>🔖</p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>
                {searchQ ? `No results for "${searchQ}"` : 'No bookmarks yet'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Hit the bookmark icon on any article to save it here.
              </p>
            </div>
          )}

          {/* Grid */}
          {!loading && visible.length > 0 && (
            <div className="bookmarks-grid">
              {visible.map(b => (
                <BookmarkCard
                  key={b.bookmark_id}
                  bookmark={b}
                  onDelete={() => handleDelete(b.bookmark_id)}
                  onShare={() => handleShare(b)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* New Collection Modal */}
      {showNewColModal && (
        <NewCollectionModal
          onClose={() => setShowNewColModal(false)}
          onCreate={async (name, icon) => {
            await bookmarkApi.createCollection(name, icon);
            await loadCollections();
            setShowNewColModal(false);
          }}
        />
      )}

      <footer className="app-footer">
        © 2024 NewsSphere AI. All rights reserved. Built for the future of information.
      </footer>
    </AppLayout>
  );
}

/* ── Bookmark Card ───────────────────────────────────────────────────────── */
function BookmarkCard({ bookmark: b, onDelete, onShare }) {
  const [imgErr,    setImgErr]    = useState(false);
  const [copied,    setCopied]    = useState(false);

  const src = imgErr
    ? `https://picsum.photos/seed/${encodeURIComponent(b.news_id || b.title || 'bm')}/600/340`
    : (b.image_url?.startsWith('http') ? b.image_url
      : `https://picsum.photos/seed/${encodeURIComponent(b.news_id || b.title || 'bm')}/600/340`);

  const handleShare = (e) => {
    e.stopPropagation();
    const url = b.url || window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      onShare?.();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleView = () => {
    if (b.url) window.open(b.url, '_blank', 'noopener,noreferrer');
  };

  const label = b.top_3_labels?.[0] || 'General';

  return (
    <div className="bookmark-card">
      <div className="bookmark-img-wrap" onClick={handleView} style={{ cursor: 'pointer' }}>
        <img
          src={src}
          alt={b.title}
          className="bookmark-img-real"
          onError={() => setImgErr(true)}
        />
        <span className="bookmark-category-badge">{label}</span>
      </div>
      <div className="bookmark-body">
        <div className="bookmark-source-row">
          <span className="bookmark-source">{(b.source_name || 'Unknown').toUpperCase()}</span>
          <span className="bookmark-time">{timeAgo(b.saved_at)}</span>
        </div>
        <h3 className="bookmark-title" onClick={handleView} style={{ cursor: 'pointer' }}>
          {b.title}
        </h3>
        <div className="bookmark-actions">
          {/* Share — copies URL */}
          <button
            className={`bookmark-action-btn ${copied ? 'copied' : ''}`}
            aria-label="Copy link"
            onClick={handleShare}
            title={copied ? 'Link copied!' : 'Copy article link'}
          >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
          </button>

          {/* Delete */}
          <button
            className="bookmark-action-btn delete"
            aria-label="Remove bookmark"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Remove from bookmarks"
          >
            <Trash2 size={14} />
          </button>

          <button className="bookmark-view-btn" onClick={handleView}>
            View Detail <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── New Collection Modal ────────────────────────────────────────────────── */
function NewCollectionModal({ onClose, onCreate }) {
  const [name,      setName]      = useState('');
  const [icon,      setIcon]      = useState('📁');
  const [creating,  setCreating]  = useState(false);
  const [error,     setError]     = useState('');

  const handleCreate = async () => {
    if (!name.trim()) { setError('Please enter a collection name.'); return; }
    setCreating(true);
    try { await onCreate(name.trim(), icon); }
    catch (e) { setError(e.message || 'Failed to create collection.'); setCreating(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FolderPlus size={18} color="#4f6ef7" />
            New Collection
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">COLLECTION NAME</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. AI Research, Read Later"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">ICON</label>
            <div className="icon-picker">
              {DEFAULT_ICONS.map(ic => (
                <button
                  key={ic}
                  className={`icon-option ${icon === ic ? 'selected' : ''}`}
                  onClick={() => setIcon(ic)}
                  type="button"
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: '13px' }}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            style={{ fontSize: '13px' }}
          >
            {creating ? <Loader size={14} className="spin-icon" /> : null}
            {creating ? 'Creating…' : 'Create Collection'}
          </button>
        </div>
      </div>
    </div>
  );
}
