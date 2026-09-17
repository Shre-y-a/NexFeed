import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Loader, ExternalLink, RefreshCw } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { userApi, timeAgo } from '../services/api';
import './AnalyticsPage.css';

// Palette for category charts
const PALETTE = ['#4f6ef7','#7c3aed','#2dd4bf','#f59e0b','#ef4444','#22c55e','#ec4899','#8b5cf6'];

// Format date label for chart axis
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function AnalyticsPage() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await userApi.getAnalytics();
      setData(d);
    } catch (e) {
      setError(e.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <AppLayout>
      <div className="analytics-loading">
        <Loader size={28} className="spin-anim" />
        <p>Loading your analytics…</p>
      </div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout>
      <div className="analytics-error page-container">
        <p>⚠️ {error}</p>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </AppLayout>
  );

  // No activity yet
  if (!data || data.summary.total_clicks === 0) return (
    <AppLayout>
      <div className="analytics-empty page-container">
        <p style={{ fontSize: 40, marginBottom: 12 }}>📊</p>
        <h2>No reading activity yet</h2>
        <p>Start reading articles and your analytics will appear here.</p>
        <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/feed')}>
          Go to Feed
        </button>
      </div>
    </AppLayout>
  );

  const { summary, daily_activity, category_dist, top_sources,
          bookmark_categories, recent_reads } = data;

  // Stat cards — only real values
  const statCards = [
    {
      label:    'Articles Read',
      value:    summary.unique_articles,
      sub:      'unique articles opened',
      icon:     '📖',
      trending: null,
    },
    {
      label:    'Total Clicks',
      value:    summary.total_clicks,
      sub:      'including re-reads',
      icon:     '👆',
      trending: null,
    },
    {
      label:    'Reading Streak',
      value:    `${summary.reading_streak} day${summary.reading_streak !== 1 ? 's' : ''}`,
      sub:      summary.reading_streak > 0 ? 'consecutive days active' : 'not on a streak yet',
      icon:     '🔥',
      trending: summary.reading_streak > 0 ? 'up' : null,
    },
    {
      label:    'Bookmarks Saved',
      value:    summary.total_bookmarks,
      sub:      `across ${summary.total_collections} collection${summary.total_collections !== 1 ? 's' : ''}`,
      icon:     '🔖',
      trending: null,
    },
  ];

  return (
    <AppLayout>
      <div className="analytics-page page-container">

        {/* Header */}
        <div className="analytics-header">
          <div>
            <h1 className="section-title">Personal Analytics</h1>
            <p className="section-subtitle">Based on your real reading activity on NewsSphere.</p>
          </div>
          <div className="analytics-actions">
            <button className="btn-secondary" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={load}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="stat-cards-grid">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">{s.label}</span>
                {s.trending && (
                  <span className={`stat-card-trend ${s.trending}`}>
                    {s.trending === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  </span>
                )}
              </div>
              <div className="stat-card-value">{s.value}</div>
              <div className="stat-card-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Summary row */}
        {(summary.favourite_category || summary.best_day) && (
          <div className="summary-row">
            {summary.favourite_category && (
              <div className="summary-chip">
                <span className="summary-chip-label">Top category</span>
                <span className="summary-chip-value" style={{ textTransform: 'capitalize' }}>
                  {summary.favourite_category}
                </span>
              </div>
            )}
            {summary.best_day && (
              <div className="summary-chip">
                <span className="summary-chip-label">Most active day</span>
                <span className="summary-chip-value">
                  {new Date(summary.best_day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  &nbsp;·&nbsp;{summary.best_day.count} articles
                </span>
              </div>
            )}
            {summary.first_read_date && (
              <div className="summary-chip">
                <span className="summary-chip-label">Reading since</span>
                <span className="summary-chip-value">
                  {new Date(summary.first_read_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Daily activity chart */}
        {daily_activity.length > 0 && (
          <div className="card chart-card wide">
            <div className="chart-header">
              <div>
                <div className="chart-title">Daily Reading Activity</div>
                <div className="chart-subtitle">Articles read per day across your history.</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={daily_activity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: '#555570', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#555570', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#16161e', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  formatter={(v) => [`${v} articles`, 'Read']}
                />
                <Line type="monotone" dataKey="articles" stroke="#4f6ef7" strokeWidth={2.5} dot={{ r: 3, fill: '#4f6ef7' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Charts row: category + sources */}
        <div className="charts-row">

          {/* Category Affinity */}
          {category_dist.length > 0 && (
            <div className="card chart-card">
              <div className="chart-title">Category Affinity</div>
              <div className="chart-subtitle">Topics you read most based on click history.</div>
              <div className="pie-wrap">
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={category_dist} cx="50%" cy="50%"
                      innerRadius={40} outerRadius={68}
                      paddingAngle={3} dataKey="count"
                      nameKey="category">
                      {category_dist.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#16161e', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 12 }}
                      formatter={(v, n, p) => [`${v} articles`, p.payload.category]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {category_dist.map((c, i) => (
                    <div key={i} className="pie-legend-item">
                      <span className="pie-dot" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span style={{ textTransform: 'capitalize' }}>{c.category}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 11 }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Sources */}
          {top_sources.length > 0 && (
            <div className="card chart-card">
              <div className="chart-title">Top Sources</div>
              <div className="chart-subtitle">News sources you read most.</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={top_sources} layout="vertical"
                  margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#555570', fontSize: 11 }} />
                  <YAxis type="category" dataKey="source" width={90}
                    tick={{ fill: '#8888aa', fontSize: 11 }}
                    tickFormatter={v => v?.length > 12 ? v.slice(0, 12) + '…' : v}
                  />
                  <Tooltip
                    contentStyle={{ background: '#16161e', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v} articles`, 'Read']}
                  />
                  <Bar dataKey="count" fill="#4f6ef7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bookmark categories (only if user has bookmarks) */}
        {bookmark_categories.length > 0 && (
          <div className="card chart-card" style={{ maxWidth: 480 }}>
            <div className="chart-title">Bookmarked Categories</div>
            <div className="chart-subtitle">What you save most.</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={bookmark_categories} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="category" tick={{ fill: '#555570', fontSize: 11 }}
                  tickFormatter={v => v?.charAt(0).toUpperCase() + v?.slice(1)} />
                <YAxis allowDecimals={false} tick={{ fill: '#555570', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#16161e', border: '1px solid #2a2a3a', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v} saved`, 'Bookmarks']}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent reads */}
        {recent_reads.length > 0 && (
          <div className="card">
            <div className="chart-title" style={{ marginBottom: 4 }}>Recently Read</div>
            <div className="chart-subtitle" style={{ marginBottom: 14 }}>Your last {recent_reads.length} articles.</div>
            <div className="recent-reads-list">
              {recent_reads.map((r, i) => (
                <div key={i} className="recent-read-item">
                  <div className="recent-read-num">{i + 1}</div>
                  <div className="recent-read-info">
                    <p className="recent-read-title">{r.title || 'Untitled'}</p>
                    <span className="recent-read-meta">{r.source} · {timeAgo(r.timestamp)}</span>
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="recent-read-link" aria-label="Open article">
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <footer className="app-footer">
        © 2024 NewsSphere AI. All rights reserved. Built for the future of information.
      </footer>
    </AppLayout>
  );
}
