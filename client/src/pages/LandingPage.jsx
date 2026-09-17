import { Link } from 'react-router-dom';
import { Zap, ArrowRight, TrendingUp, ChevronRight, GitFork, Globe, Mail } from 'lucide-react';
import './LandingPage.css';

const trendingArticles = [
  { category: 'Fullcover', tag: '#Future', title: 'The Quantum Loop: New Silicon Breakthrough in 2024', author: 'Via Al Go', time: '2h', seed: 'quantum-loop' },
  { category: 'Politics', tag: '#Policy', title: 'Global Markets Stabilize as AI Productivity Slows Risk', author: 'Via Al Go', time: '4h', seed: 'global-markets' },
  { category: 'Policy', tag: '#Privacy', title: 'The Digital Sovereignty Act: What It Means for Privacy', author: 'Niall R', time: '6h', seed: 'digital-sovereignty' },
];

const features = [
  { icon: '⚡', title: 'AI Synthesis', desc: 'Our AI synthesizes thousands of sources into a single, coherent narrative so you never miss the full picture.' },
  { icon: '🎯', title: 'Instant Relevance', desc: 'Personalized algorithms deliver the stories that matter to you before you even know to search for them.' },
  { icon: '🛡️', title: 'Trust Protocol', desc: 'Every article is scored for source credibility, giving you confidence in every story you read.' },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-left">
          <div className="logo-icon-sm"><Zap size={14} color="#4f6ef7" /></div>
          <span className="logo-text-landing">NewsSphere</span>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#trending">Trending</a>
            <a href="#blog">Blog</a>
          </div>
        </div>
        <div className="landing-nav-right">
          <Link to="/login" className="nav-signin">Sign In</Link>
          <Link to="/signup" className="btn-primary">Get Started →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-badge">
          <span className="hero-badge-dot pulse" />
          Powered by Readers + AI
        </div>
        <h1 className="hero-title">
          Your Personalized News,<br />
          <span className="hero-title-accent">Smarter</span>
        </h1>
        <p className="hero-subtitle">
          Experience the next generation of information. Our AI curates, summarizes, and<br />
          delivers the right stories to match your unique interests.
        </p>
        <div className="hero-cta">
          <Link to="/signup" className="btn-primary hero-btn">
            Get Started Free <ArrowRight size={16} />
          </Link>
          <Link to="/explore" className="btn-secondary hero-btn">
            Explore Trends
          </Link>
        </div>

        {/* Hero visual */}
        <div className="hero-visual">
          <div className="hero-visual-inner">
            <div className="hero-stat">
              <TrendingUp size={16} color="#4f6ef7" />
              <span className="hero-stat-num">14.2M</span>
              <span className="hero-stat-label">Articles Indexed Today</span>
            </div>
            <div className="neural-orb" />
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="category-pills">
        {['AI & Machine Learning', 'Climate Tech', 'Quantum Computing', 'Cryptocurrency', 'Biotech & Health', 'Space Exploration'].map(cat => (
          <button key={cat} className="pill">{cat}</button>
        ))}
      </section>

      {/* Trending Now */}
      <section className="trending-section" id="trending">
        <div className="trending-header">
          <div>
            <div className="section-eyebrow">LIVE NOW</div>
            <h2 className="section-heading">Trending Now</h2>
            <p className="section-desc">The stories gripping global conversations right now, summarized by our neural engine.</p>
          </div>
          <Link to="/explore" className="view-all-btn">View All Trends</Link>
        </div>
        <div className="trending-grid">
          {trendingArticles.map((art, i) => (
            <div key={i} className="trending-card">
              <div className="trending-card-img">
                <img
                  src={`https://picsum.photos/seed/${art.seed}/480/200`}
                  alt={art.title}
                  className="trending-card-img-real"
                />
                <div className="trending-card-overlay">
                  <span className="tag badge-blue">{art.category}</span>
                </div>
              </div>
              <div className="trending-card-body">
                <p className="trending-card-title">{art.title}</p>
                <div className="trending-card-meta">
                  <span>{art.author}</span>
                  <span>{art.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="section-eyebrow center">HOW IT WORKS</div>
        <h2 className="section-heading center">How Intelligence Redefines News</h2>
        <p className="section-desc center">Advanced AI transforms how you consume, process, and understand information.</p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof">
        <div className="avatars-row">
          {[1, 2, 3, 4, 5].map(i => (
            <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="" className="proof-avatar" />
          ))}
        </div>
        <p className="social-proof-text">Join 2,000,000+ Informed Thinkers</p>
        <div className="star-row">{'★★★★★'}</div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner">
        <h2 className="cta-title">Ready to evolve your newsfeed?</h2>
        <div className="cta-actions">
          <Link to="/signup" className="btn-primary">Create My AI Profile →</Link>
          <Link to="/feed" className="btn-ghost">My Own Read... &gt;</Link>
          <Link to="/explore" className="btn-ghost">Explore &gt;</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <div className="logo-icon-sm"><Zap size={14} color="#4f6ef7" /></div>
          <span className="logo-text-landing">NewsSphere</span>
          <p className="footer-tagline">Redefining how you experience AI-driven personalized news, one story at a time.</p>
          <div className="footer-socials">
            <a href="#" aria-label="Twitter"><Globe size={16} /></a>
            <a href="#" aria-label="Github"><GitFork size={16} /></a>
            <a href="#" aria-label="LinkedIn"><Mail size={16} /></a>
          </div>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Platform</h4>
            <Link to="/feed">Personalized Feed</Link>
            <Link to="/explore">Explore Topics</Link>
            <Link to="/analytics">Analytics</Link>
            <Link to="/bookmarks">All Bookmarks</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Press</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
          <div className="footer-col">
            <h4>Newsletter</h4>
            <p className="footer-newsletter-desc">Stay ahead with the latest AI news, weekly.</p>
            <div className="footer-newsletter-input">
              <input type="email" placeholder="All address" className="input-field" />
              <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2024 NewsSphere AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
