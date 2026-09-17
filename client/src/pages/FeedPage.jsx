import { useState, useEffect, useCallback, useRef } from 'react';
import { Share2, TrendingUp, ChevronRight, Check, Loader, FolderPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { newsApi, bookmarkApi, resolveImage, timeAgo, primaryLabel } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './FeedPage.css';

/**
 * Tab config:
 * - source: 'recommendations' | 'live'
 * - category: GNews query category passed to /api/news/live
 */
const TABS = [
  { label: 'For You',     source: 'recommendations', category: null        },
  { label: 'Trending',    source: 'live',             category: 'trending'  },
  { label: 'Latest',      source: 'live',             category: 'latest'    },
  { label: 'Technology',  source: 'live',             category: 'technology'},
  { label: 'Science',     source: 'live',             category: 'science'   },
  { label: 'Business',    source: 'live',             category: 'business'  },
  { label: 'Sports',      source: 'live',             category: 'sports'    },
  { label: 'Health',      source: 'live',             category: 'health'    },
];

const trendingTopics = [
  { rank: '01', topic: 'Generative AI Regulation', change: '+124%' },
  { rank: '02', topic: 'SpaceX Starship Launch',   change: '+88%'  },
  { rank: '03', topic: 'Quantum Computing',         change: '+45%'  },
  { rank: '04', topic: 'Global Semiconductor Shift',change: '+32%'  },
  { rank: '05', topic: 'Renewable Energy Subsidy',  change: '+12%'  },
];

const flashNews = [
  { time: '08:41 AM', headline: 'Fed signals potential rate hold as inflation cools.' },
  { time: '08:42 AM', headline: 'Meta launches Llama 4 internal testing phase.'       },
  { time: '08:43 AM', headline: 'Global markets react to new EU tech tariffs.'        },
];

export default function FeedPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const runId     = useRef(0);

  const [activeTab,           setActiveTab]           = useState(0);
  const [articles,            setArticles]            = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState('');
  const [hasPersonalization,  setHasPersonalization]  = useState(false);

  const fetchArticles = useCallback(async (tabIndex) => {
    const myRun = ++runId.current;
    setLoading(true);
    setError('');

    const tab = TABS[tabIndex];

    try {
      let data;

      if (tab.source === 'recommendations') {
        // "For You" — DB recommendations based on click history
        data = await newsApi.getRecommendations(20);
        if (myRun !== runId.current) return;
        setHasPersonalization(data.has_personalization || false);
      } else {
        // All other tabs — live from GNews API
        data = await newsApi.getLiveNews(tab.category, 20);
        if (myRun !== runId.current) return;
        setHasPersonalization(false);
      }

      setArticles(data.news || []);
    } catch (err) {
      if (myRun === runId.current) setError(err.message);
    } finally {
      if (myRun === runId.current) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticles(activeTab); }, [activeTab, fetchArticles]);

  const handleArticleClick = async (article) => {
    // Record click for recommendation engine training
    if (article.news_id) {
      try { await newsApi.recordClick(article.news_id); } catch (_) {}
    }
    if (article.url) window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  return (
    <AppLayout>
      <div className="feed-page">
        <div className="feed-main">

          <div className="feed-greeting">
            <span className="greeting-icon">⚡</span>
            <span className="greeting-text">
              {greeting()}{user ? `, ${user.username?.toUpperCase()}` : ''}
            </span>
          </div>

          <h1 className="feed-title">
            {TABS[activeTab].source === 'recommendations'
              ? 'Your Personalized Feed'
              : `${TABS[activeTab].label} News`}
          </h1>

          <p className="feed-subtitle">
            {TABS[activeTab].source === 'recommendations'
              ? 'AI-curated stories based on your reading history and interests.'
              : `Fresh ${TABS[activeTab].label.toLowerCase()} stories fetched live from GNews.`}
          </p>

          {/* Personalization banner — only on "For You" tab */}
          {activeTab === 0 && (
            <div className={`reco-banner ${hasPersonalization ? 'active' : 'cold'}`}>
              {hasPersonalization
                ? '✦ Personalised based on your reading history — keep clicking to improve accuracy'
                : '🌱 New here? Click articles to train your personal feed'}
            </div>
          )}

          {/* Live source indicator for non-recommendation tabs */}
          {activeTab !== 0 && !loading && articles.length > 0 && (
            <div className="live-source-banner">
              🔴 Live from GNews API · {articles.length} articles · {TABS[activeTab].label}
            </div>
          )}

          {/* Tabs */}
          <div className="feed-tabs">
            {TABS.map((tab, i) => (
              <button
                key={tab.label}
                className={`feed-tab ${activeTab === i ? 'active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* States */}
          {loading && <ArticleSkeleton />}

          {!loading && error && (
            <div className="feed-error">
              <p>⚠️ {error}</p>
              <button className="btn-secondary" onClick={() => fetchArticles(activeTab)}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && articles.length === 0 && (
            <div className="feed-empty">
              <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
              <p>No articles found.</p>
              <button className="text-link" onClick={() => fetchArticles(activeTab)}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && articles.length > 0 && (
            <div className="articles-list">
              {articles.map((art, idx) => (
                <ArticleCard
                  key={art.news_id || art.url || idx}
                  article={art}
                  onClick={() => handleArticleClick(art)}
                />
              ))}
            </div>
          )}

          {!loading && articles.length > 0 && (
            <div className="feed-loading">
              <div className="loading-dots"><span /><span /><span /></div>
              <span className="loading-text">SCANNING FOR MORE CONTENT</span>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <aside className="feed-sidebar">
          <div className="card sidebar-card">
            <div className="ai-insight-header">
              <span className="ai-insight-icon">⚡</span>
              <span className="ai-insight-title">Your AI Insight</span>
            </div>
            <p className="ai-insight-text">
              {activeTab === 0
                ? 'Your feed is powered by your click history. The more you read, the smarter it gets.'
                : `You're viewing live ${TABS[activeTab].label} news. Switch to "For You" for personalised picks.`}
            </p>
            <div className="reading-streak">
              <span className="streak-label">RECOMMENDATION ENGINE</span>
              <span className="streak-value">✦ Active</span>
            </div>
            <button className="btn-secondary full-width" onClick={() => navigate('/analytics')}>
              View Full Analytics
            </button>
          </div>

          <div className="card sidebar-card">
            <div className="sidebar-section-title">
              <TrendingUp size={14} color="#4f6ef7" />
              TRENDING TOPICS
            </div>
            <div className="trending-list">
              {trendingTopics.map((t) => (
                <div key={t.rank} className="trending-row">
                  <span className="trending-rank">{t.rank}</span>
                  <span className="trending-topic">{t.topic}</span>
                  <span className={`trending-change ${t.change.startsWith('+') ? 'positive' : 'negative'}`}>
                    {t.change}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="btn-ghost full-width"
              style={{ justifyContent: 'center', marginTop: '12px' }}
              onClick={() => navigate('/explore')}
            >
              Explore Trends
            </button>
          </div>

          <div className="card sidebar-card">
            <div className="flash-header">
              <div className="sidebar-section-title">⚡ FLASH NEWS</div>
              <span className="live-badge">LIVE</span>
            </div>
            <div className="flash-list">
              {flashNews.map((n, i) => (
                <div key={i} className="flash-item">
                  <span className="flash-time">{n.time}</span>
                  <span className="flash-headline">{n.headline}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card sidebar-card">
            <div className="sidebar-section-title">📊 Weekly Goal</div>
            <p className="goal-desc">Keep reading to train your AI feed</p>
            <div className="goal-bar">
              <div className="goal-fill" style={{ width: `${Math.min(articles.length * 5, 100)}%` }} />
            </div>
            <p className="goal-note">Every article you click improves your recommendations.</p>
          </div>
        </aside>
      </div>

      <footer className="app-footer">
        © 2024 NewsSphere AI. All rights reserved. Built for the future of information.
      </footer>
    </AppLayout>
  );
}

/* ── Article Card ─────────────────────────────────────────────────────────── */
function ArticleCard({ article, onClick }) {
  const [imgError,    setImgError]    = useState(false);
  const [showBmPicker,setShowBmPicker]= useState(false);
  const [bookmarked,  setBookmarked]  = useState(false);
  const [copied,      setCopied]      = useState(false);

  const imgSrc = imgError
    ? `https://picsum.photos/seed/${encodeURIComponent(article.news_id || article.title || 'news')}/400/220`
    : resolveImage(article);

  const handleShare = (e) => {
    e.stopPropagation();
    const url = article.url || window.location.href;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    setShowBmPicker(p => !p);
  };

  return (
    <article className="article-card fade-in" onClick={onClick} style={{ cursor: 'pointer', position: 'relative' }}>
      <div className="article-img-wrap">
        <img
          src={imgSrc}
          alt={article.title}
          className="article-img"
          onError={() => setImgError(true)}
        />
        <div className="article-match-badge">
          <span>⊕ AI Match</span>
        </div>
      </div>
      <div className="article-body">
        <div className="article-meta">
          <span className="tag badge-blue">{primaryLabel(article)}</span>
          <span className="article-time">⏱ {timeAgo(article.published_at)}</span>
        </div>
        <h2 className="article-title">{article.title}</h2>
        <p className="article-desc">{article.description}</p>
        <div className="article-actions">
          {/* Bookmark button */}
          <button
            className={`icon-action ${bookmarked ? 'bookmarked' : ''}`}
            aria-label="Bookmark"
            onClick={handleBookmarkClick}
            title="Save to collection"
          >
            <BookmarkIcon filled={bookmarked} />
          </button>

          {/* Share / copy URL */}
          <button
            className={`icon-action ${copied ? 'copied' : ''}`}
            aria-label="Copy link"
            onClick={handleShare}
            title={copied ? 'Link copied!' : 'Copy article link'}
          >
            {copied ? <Check size={16} /> : <Share2 size={16} />}
          </button>

          <span className="result-source" style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
            {article.source_name}
          </span>
          <button className="read-more-btn">
            Read More <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Collection picker dropdown */}
      {showBmPicker && (
        <CollectionPicker
          article={article}
          onClose={() => setShowBmPicker(false)}
          onSaved={() => { setBookmarked(true); setShowBmPicker(false); }}
        />
      )}
    </article>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
function ArticleSkeleton() {
  return (
    <div className="articles-list">
      {[1, 2, 3].map((i) => (
        <div key={i} className="article-card skeleton-card">
          <div className="skeleton-img" />
          <div className="skeleton-body">
            <div className="skeleton-line short" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Collection Picker Dropdown ─────────────────────────────────────────── */
function CollectionPicker({ article, onClose, onSaved }) {
  const [collections,   setCollections]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(null); // collection_id being saved
  const [saved,         setSaved]         = useState({});   // collection_id → true
  const [showNew,       setShowNew]       = useState(false);
  const [newName,       setNewName]       = useState('');
  const [creating,      setCreating]      = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    bookmarkApi.getCollections()
      .then(d => setCollections(d.collections || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (collection_id) => {
    setSaving(collection_id);
    setError('');
    try {
      await bookmarkApi.addBookmark(collection_id, article);
      setSaved(p => ({ ...p, [collection_id]: true }));
      setTimeout(onSaved, 600);
    } catch (e) {
      setError(e.message === 'Already bookmarked in this collection' ? 'Already saved here.' : e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleCreateAndSave = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const data = await bookmarkApi.createCollection(newName.trim(), '📁');
      const col = data.collection;
      setCollections(prev => [...prev, { ...col, count: 0 }]);
      setNewName('');
      setShowNew(false);
      await handleSave(col.collection_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="collection-picker"
      onClick={e => e.stopPropagation()}
    >
      <div className="cp-header">
        <span>Save to collection</span>
        <button className="cp-close" onClick={onClose}><X size={13} /></button>
      </div>

      {error && <p className="cp-error">{error}</p>}

      {loading ? (
        <div className="cp-loading"><Loader size={14} className="spin-icon" /></div>
      ) : (
        <div className="cp-list">
          {collections.length === 0 && !showNew && (
            <p className="cp-empty">No collections yet.</p>
          )}
          {collections.map(col => (
            <button
              key={col.collection_id}
              className={`cp-item ${saved[col.collection_id] ? 'saved' : ''}`}
              onClick={() => !saved[col.collection_id] && handleSave(col.collection_id)}
              disabled={saving === col.collection_id}
            >
              <span>{col.icon} {col.name}</span>
              {saving === col.collection_id
                ? <Loader size={13} className="spin-icon" />
                : saved[col.collection_id]
                  ? <Check size={13} />
                  : <span className="cp-count">{col.count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Create new inline */}
      {showNew ? (
        <div className="cp-new-form">
          <input
            type="text"
            className="input-field"
            placeholder="Collection name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateAndSave()}
            autoFocus
            style={{ fontSize: '13px', padding: '7px 10px' }}
          />
          <button className="btn-primary" style={{ padding: '7px 12px', fontSize: '12px' }}
            onClick={handleCreateAndSave} disabled={creating || !newName.trim()}>
            {creating ? <Loader size={12} className="spin-icon" /> : 'Save'}
          </button>
          <button className="btn-ghost" style={{ padding: '7px 8px' }} onClick={() => setShowNew(false)}>
            <X size={13} />
          </button>
        </div>
      ) : (
        <button className="cp-new-btn" onClick={() => setShowNew(true)}>
          <FolderPlus size={13} /> New collection
        </button>
      )}
    </div>
  );
}
