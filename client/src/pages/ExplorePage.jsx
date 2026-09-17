import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, RotateCcw, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { newsApi, resolveImage, timeAgo, primaryLabel } from '../services/api';
import './ExplorePage.css';

// ── These must match the actual classifier labels stored in the DB ──────────
const DOMAIN_MAP = {
  'News':          'news',
  'Finance':       'finance',
  'Health':        'health',
  'Sports':        'sports',
  'Travel':        'travel',
  'Lifestyle':     'lifestyle',
  'Entertainment': 'movies',
  'Music':         'music',
  'Weather':       'weather',
};
const DOMAINS = Object.keys(DOMAIN_MAP);

const RECENCY_OPTIONS = ['All Time', 'Last 24 Hours', 'Last 7 Days', 'Last 30 Days'];
const RECENCY_DAYS    = { 'All Time': null, 'Last 24 Hours': 1, 'Last 7 Days': 7, 'Last 30 Days': 30 };

const LIVE_TRENDS = [
  { label: 'Large Language Models', query: 'language' },
  { label: 'NVIDIA Stock',          query: 'NVIDIA'   },
  { label: 'Mars Colonization',     query: 'mars'     },
  { label: 'Sustainable Energy',    query: 'energy'   },
  { label: 'Web3 Future',           query: 'web3'     },
  { label: 'Quantum Supremacy',     query: 'quantum'  },
];

const PAGE_SIZE = 6;

export default function ExplorePage() {
  const [query,           setQuery]           = useState('');
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [selectedRecency, setSelectedRecency] = useState('All Time');
  const [sortBy,          setSortBy]          = useState('relevance');
  const [activeTrend,     setActiveTrend]     = useState(null);
  const [allResults,      setAllResults]      = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [currentPage,     setCurrentPage]     = useState(1);
  const runId = useRef(0);

  // ── core fetch ────────────────────────────────────────────────────────────
  const fetchResults = useCallback(async ({ q = '', domains = [], trend = null } = {}) => {
    const myRun = ++runId.current;
    setLoading(true);
    setError('');
    setCurrentPage(1);

    try {
      const searchTerm = (trend?.query || q || '').trim();
      let data;

      if (searchTerm) {
        // Live search from GNews, fall back to DB if empty
        data = await newsApi.getLiveNews(searchTerm, 60);
        if (!data.news?.length) data = await newsApi.search(searchTerm, 60);
      } else if (domains.length === 1) {
        // Single domain — live fetch
        data = await newsApi.getLiveNews(DOMAIN_MAP[domains[0]], 60);
      } else if (domains.length > 1) {
        // Multiple domains — parallel live fetches, merge & dedupe
        const fetches = await Promise.all(
          domains.map(d => newsApi.getLiveNews(DOMAIN_MAP[d], 20).catch(() => ({ news: [] })))
        );
        const seen = new Set();
        const merged = [];
        fetches.forEach(f =>
          (f.news || []).forEach(a => {
            const key = a.news_id || a.url;
            if (!seen.has(key)) { seen.add(key); merged.push(a); }
          })
        );
        data = { news: merged };
      } else {
        // No filter — live general feed
        data = await newsApi.getLiveNews('general', 60);
      }

      if (myRun !== runId.current) return;
      setAllResults(data.news || []);
    } catch (err) {
      if (myRun === runId.current) setError(err.message);
    } finally {
      if (myRun === runId.current) setLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => { fetchResults(); }, [fetchResults]);

  // toggle domain and immediately refetch with new list
  const toggleDomain = (d) => {
    setSelectedDomains(prev => {
      const next = prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d];
      fetchResults({ q: query, domains: next, trend: activeTrend });
      return next;
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveTrend(null);
    fetchResults({ q: query, domains: selectedDomains });
  };

  const handleTrendClick = (trend) => {
    setActiveTrend(trend);
    setQuery(trend.label);
    setSelectedDomains([]);
    fetchResults({ trend });
  };

  const resetFilters = () => {
    setSelectedDomains([]);
    setSelectedRecency('All Time');
    setSortBy('relevance');
    setActiveTrend(null);
    setQuery('');
    fetchResults({});
  };

  // ── client-side recency + sort (no filtering when 'All Time') ─────────────
  const visibleResults = (() => {
    let list = [...allResults];
    const days = RECENCY_DAYS[selectedRecency];
    if (days !== null) {
      const cutoff = Date.now() - days * 86400 * 1000;
      list = list.filter(a => !a.published_at || new Date(a.published_at).getTime() >= cutoff);
    }
    if (sortBy === 'date') {
      list.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
    }
    return list;
  })();

  const totalPages  = Math.max(1, Math.ceil(visibleResults.length / PAGE_SIZE));
  const pageResults = visibleResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="explore-page">

        {/* Search bar */}
        <div className="explore-search-bar">
          <form className="explore-search-wrap" onSubmit={handleSearch}>
            <Search size={16} className="explore-search-icon" />
            <input
              type="text"
              placeholder="Discover the future of news..."
              className="explore-search-input"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveTrend(null); }}
              aria-label="Search articles"
            />
            <button type="submit" className="btn-primary explore-analyze-btn">Analyze</button>
          </form>
        </div>

        {/* Live Trends */}
        <div className="live-trends">
          <div className="trends-label">
            <TrendingUp size={13} />
            <span>LIVE TRENDS:</span>
          </div>
          <div className="trends-pills">
            {LIVE_TRENDS.map((t) => (
              <button
                key={t.label}
                className={`trend-pill ${activeTrend?.label === t.label ? 'active' : ''}`}
                onClick={() => handleTrendClick(t)}
              >
                {t.label} <span>→</span>
              </button>
            ))}
          </div>
        </div>

        <div className="explore-body">

          {/* Filters panel */}
          <aside className="filters-panel">
            <div className="filters-header">
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              <button className="reset-btn" onClick={resetFilters}>
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            {/* Domains */}
            <div className="filter-section">
              <div className="filter-section-title">⊕ DOMAINS</div>
              {DOMAINS.map((d) => (
                <label key={d} className="filter-check-item">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selectedDomains.includes(d)}
                    onChange={() => toggleDomain(d)}
                  />
                  <span>{d}</span>
                </label>
              ))}
            </div>

            {/* Recency */}
            <div className="filter-section">
              <div className="filter-section-title">⏱ RECENCY</div>
              {RECENCY_OPTIONS.map((r) => (
                <button
                  key={r}
                  className={`recency-option ${selectedRecency === r ? 'active' : ''}`}
                  onClick={() => { setSelectedRecency(r); setCurrentPage(1); }}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="filter-section">
              <div className="filter-section-title">↕ SORT BY</div>
              <div className="sentiment-buttons">
                {[['relevance', 'Relevance'], ['date', 'Latest']].map(([v, l]) => (
                  <button
                    key={v}
                    className={`sentiment-btn ${sortBy === v ? 'active' : ''}`}
                    onClick={() => { setSortBy(v); setCurrentPage(1); }}
                    style={{ flex: 'none', padding: '6px 14px' }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Active filter chips */}
            {(selectedDomains.length > 0 || activeTrend) && (
              <div className="filter-section">
                <div className="filter-section-title">ACTIVE FILTERS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {activeTrend && (
                    <span className="active-filter-chip">
                      🔥 {activeTrend.label}
                      <button onClick={() => { setActiveTrend(null); setQuery(''); fetchResults({ domains: selectedDomains }); }}>×</button>
                    </span>
                  )}
                  {selectedDomains.map(d => (
                    <span key={d} className="active-filter-chip">
                      {d}
                      <button onClick={() => toggleDomain(d)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Results */}
          <div className="search-results">
            <div className="results-header">
              <div>
                <h2 className="results-title">
                  {activeTrend        ? `Trending: ${activeTrend.label}`  :
                   selectedDomains.length ? selectedDomains.join(', ')    :
                   query              ? `Results for "${query}"`           : 'All Articles'}
                </h2>
                <p className="results-count">
                  {loading ? 'Fetching…' : `${visibleResults.length} articles found`}
                </p>
              </div>
              <div className="sort-control">
                <span className="sort-label">SORT BY:</span>
                <button
                  className="sort-btn"
                  onClick={() => { setSortBy(s => s === 'relevance' ? 'date' : 'relevance'); setCurrentPage(1); }}
                >
                  <TrendingUp size={13} /> {sortBy === 'relevance' ? 'Relevance' : 'Latest'}
                </button>
              </div>
            </div>

            {/* Skeleton */}
            {loading && (
              <div className="results-grid">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="result-card">
                    <div className="skeleton-img" style={{ height: 130 }} />
                    <div className="skeleton-body" style={{ padding: '12px' }}>
                      <div className="skeleton-line short" />
                      <div className="skeleton-line" />
                      <div className="skeleton-line" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <p style={{ color: '#f87171', marginBottom: 12 }}>⚠️ {error}</p>
                <button className="btn-secondary"
                  onClick={() => fetchResults({ q: query, domains: selectedDomains, trend: activeTrend })}>
                  Retry
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && visibleResults.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
                <p style={{ fontWeight: 600, marginBottom: 6 }}>No articles found</p>
                <p style={{ fontSize: 13 }}>
                  {selectedRecency !== 'All Time'
                    ? `No articles in the "${selectedRecency}" window. Try "All Time".`
                    : 'Try a different search term or domain filter.'}
                </p>
                <button className="btn-secondary" style={{ marginTop: 16 }} onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
            )}

            {/* Cards */}
            {!loading && !error && pageResults.length > 0 && (
              <div className="results-grid">
                {pageResults.map((art, idx) => (
                  <ExploreCard key={art.news_id || idx} article={art} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p}
                    className={`page-btn ${currentPage === p ? 'active' : ''}`}
                    onClick={() => setCurrentPage(p)}>
                    {p}
                  </button>
                ))}
                {totalPages > 5 && <span className="page-ellipsis">…</span>}
                {totalPages > 5 && (
                  <button
                    className={`page-btn ${currentPage === totalPages ? 'active' : ''}`}
                    onClick={() => setCurrentPage(totalPages)}>
                    {totalPages}
                  </button>
                )}
                <button className="page-btn" disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="app-footer">
        © 2024 NewsSphere AI. All rights reserved. Built for the future of information.
      </footer>
    </AppLayout>
  );
}

/* ── Card component ──────────────────────────────────────────────────────── */
function ExploreCard({ article }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = imgError
    ? `https://picsum.photos/seed/${encodeURIComponent(article.news_id || 'news')}/600/340`
    : resolveImage(article);

  const handleClick = async () => {
    try { await newsApi.recordClick(article.news_id); } catch (_) {}
    if (article.url) window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="result-card" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <div className="result-img-wrap">
        <img
          src={imgSrc}
          alt={article.title}
          className="result-img-real"
          onError={() => setImgError(true)}
        />
        <span className="result-category">{primaryLabel(article)}</span>
      </div>
      <div className="result-body">
        <div className="result-meta">
          <span className="result-source">{(article.source_name || 'Unknown').toUpperCase()}</span>
          <span className="result-time">{timeAgo(article.published_at)}</span>
        </div>
        <h3 className="result-title">{article.title}</h3>
        <p className="result-desc">{article.description}</p>
        <div className="result-labels">
          {(article.top_3_labels || []).slice(0, 3).map(l => (
            <span key={l} className="result-label-chip">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
