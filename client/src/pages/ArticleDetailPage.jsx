import { Bookmark, Share2, ThumbsUp, MessageSquare, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import './ArticleDetailPage.css';

const relatedArticles = [
  { title: 'Inside the Quantum Advantage: AI Labs in 2024 full investigation', time: '8 Mins', seed: 'quantum-ai-labs' },
  { title: "Why Lattice-Based Cryptography is Today's Best Bet", time: '14 Mins', seed: 'lattice-crypto' },
  { title: '10 Companies Leading the Quantum Security Change in 2028', time: '14 Mins', seed: 'quantum-security' },
];

const comments = [
  {
    id: 1,
    author: 'Marcus Hartley',
    role: 'CRYPTOGRAPHY ANALYST',
    time: '7m ago',
    content: 'The concept of "Crypto-Agility" is something my team is struggling with right now. Most legacy banks have hard-coded RSA implementations that will raise alarms in regards. Great overview of the urgency.',
    likes: 12,
  },
  {
    id: 2,
    author: 'Sarah Chen',
    role: 'TECH WRITER',
    time: '9m ago',
    content: "Don't forget about the side-channel problem in quantum networks. We need quantum computers in practice over long distances. Excellent write-up check!",
    likes: 8,
  },
];

export default function ArticleDetailPage() {
  return (
    <AppLayout>
      <div className="article-page">
        {/* Main article */}
        <main className="article-main">
          <div className="article-breadcrumb">
            <span>Technology</span>
            <ChevronRight size={12} />
            <span>Quantum Computing</span>
          </div>

          <div className="article-header-bar">
            <span className="article-ai-badge">🤖 AI Analyst Ready</span>
          </div>

          <h1 className="article-page-title">
            The Quantum Horizon: Navigating the 2025 Cryptographic Shift
          </h1>

          {/* Hero image */}
          <div className="article-hero-img-wrap">
            <img
              src="https://picsum.photos/seed/quantum-cryptography/900/420"
              alt="Quantum Cryptography"
              className="article-hero-img"
            />
          </div>

          <div className="article-byline">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Blake"
              alt="Blake Vance"
              className="author-avatar"
            />
            <div className="byline-info">
              <span className="byline-name">Blake Vance</span>
              <span className="byline-role">Lead Tech Analyst • 11 min read</span>
            </div>
            <div className="byline-stats">
              <span>March 14, 2024</span>
              <span className="dot-sep">·</span>
              <span>48.2K</span>
            </div>
            <div className="byline-actions">
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '13px' }}>
                <Bookmark size={14} /> Save
              </button>
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '13px' }}>
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>

          <div className="article-content">
            <p>
              The intersection of quantum mechanics and information theory has moved from the realm of academic curiosities to the center of global geopolitical strategy. As we approach the mid-2020s, the "Quantum Advantage"—the point where quantum computers can perform tasks impossible for classical counterparts—is no longer a distant dream.
            </p>

            <h2 className="article-section-heading">— The Shor Risk and Modern Security</h2>
            <p>
              Encryption as we know it—RSA and ECC—relies on the mathematical difficulty of factoring large integers. Shor's algorithm, if run on a sufficiently powerful quantum computer, could break these standards in minutes. This looming threat has triggered a gold rush for Post-Quantum Cryptography (PQC).
            </p>

            <blockquote className="article-quote">
              "We are entering an era where the security of our past data is as vulnerable as our future communications. The transition to quantum-resistant standards isn't optional; it's existential."
              <cite>— Dr. Ava Thorne, NIST Lead</cite>
            </blockquote>

            <p>
              Several international standards agencies are now finalizing the first batch of PQC algorithms. Organizations are encouraged to begin "crypto-agility" assessments—ensuring their software stacks can swap out classical algorithms for new, lattice-based alternatives without a complete re-architecture.
            </p>

            <h2 className="article-section-heading">— Beyond Encryption: The Computing Upside</h2>
            <p>
              While the security implications dominate headlines, the positive potential for material sciences and drug discovery is staggering. Quantum simulations allow us to model molecular interactions at an atomic level with 100% fidelity, potentially cutting pharmaceutical R&D cycles from years to weeks.
            </p>
          </div>

          {/* Engagement */}
          <div className="article-engagement">
            <button className="engage-btn">
              <ThumbsUp size={16} /> 1,764
            </button>
            <button className="engage-btn">
              <MessageSquare size={16} /> 47 Comments
            </button>
            <button className="engage-btn">
              <Share2 size={16} />
            </button>
            <button className="engage-btn">
              <Bookmark size={16} />
            </button>
          </div>

          {/* Comments */}
          <div className="comments-section">
            <div className="comments-header">
              <h3>Community Dialogue</h3>
              <a href="#" className="text-link" style={{ fontSize: '12px' }}>View Community Guidelines</a>
            </div>

            <div className="comment-input-wrap">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Me"
                alt="You"
                className="author-avatar"
              />
              <input
                type="text"
                placeholder="Share your insights on quantum cryptography..."
                className="input-field"
              />
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Post Thought</button>
            </div>

            <div className="comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment-card">
                  <div className="comment-header">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.author}`}
                      alt={c.author}
                      className="author-avatar"
                    />
                    <div className="comment-author-info">
                      <span className="comment-author-name">{c.author}</span>
                      <span className="comment-author-role">{c.role}</span>
                    </div>
                    <span className="comment-time">{c.time}</span>
                  </div>
                  <p className="comment-text">{c.content}</p>
                  <div className="comment-actions">
                    <button className="engage-btn">
                      <ThumbsUp size={13} /> {c.likes}
                    </button>
                    <button className="engage-btn">Reply</button>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-ghost" style={{ margin: '0 auto', display: 'flex' }}>
              Load 40 more comments
            </button>
          </div>
        </main>

        {/* Right sidebar */}
        <aside className="article-sidebar">
          {/* AI Deep Summary */}
          <div className="card art-sidebar-card">
            <div className="sidebar-section-title" style={{ marginBottom: '10px' }}>
              ⚡ AI Deep Summary
            </div>
            <ul className="ai-summary-list">
              <li>The global AI towards quantum computing is accelerating, with major breakthroughs in error correction.</li>
              <li>New research suggests private-public partnerships are outperforming traditional state-funded models.</li>
              <li>Security implications for existing blockchain structures remain a primary concern for 2025.</li>
            </ul>
            <button className="btn-ghost full-width" style={{ justifyContent: 'center', marginTop: '8px', fontSize: '12px' }}>
              Generate Audio Brief
            </button>
          </div>

          {/* Sentiment */}
          <div className="card art-sidebar-card">
            <div className="sidebar-section-title" style={{ marginBottom: '10px' }}>
              🧠 Sentiment Analysis
            </div>
            <div className="sentiment-grid">
              <div className="sentiment-cell critical">
                <div className="sent-label">CRITICAL</div>
                <div className="sent-bar"><div className="sent-fill" style={{ width: '70%' }} /></div>
              </div>
              <div className="sentiment-cell neutral">
                <div className="sent-label">NEUTRAL</div>
                <div className="sent-bar"><div className="sent-fill neu" style={{ width: '40%' }} /></div>
              </div>
              <div className="sentiment-cell positive">
                <div className="sent-label">POSITIVE</div>
                <div className="sent-bar"><div className="sent-fill pos" style={{ width: '55%' }} /></div>
              </div>
            </div>
            <p className="sentiment-note">This article presents a critical perspective on the future of democratic institutions.</p>
          </div>

          {/* Author */}
          <div className="card art-sidebar-card">
            <div className="sidebar-section-title" style={{ marginBottom: '10px' }}>ABOUT THE AUTHOR</div>
            <div className="author-mini">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Blake"
                alt="Blake Vance"
                className="author-avatar-lg"
              />
              <div>
                <div className="author-mini-name">Blake Vance</div>
                <div className="author-mini-bio">Lead Technology Editor at IntelliSphere. Covering technology since 2015.</div>
              </div>
            </div>
            <button className="btn-secondary full-width" style={{ marginTop: '10px', justifyContent: 'center', fontSize: '13px' }}>
              Follow
            </button>
          </div>

          {/* Related */}
          <div className="card art-sidebar-card">
            <div className="sidebar-section-title" style={{ marginBottom: '12px' }}>⚡ Related Intelligence</div>
            <div className="related-list">
              {relatedArticles.map((r, i) => (
                <div key={i} className="related-item">
                  <img
                    src={`https://picsum.photos/seed/${r.seed}/120/80`}
                    alt={r.title}
                    className="related-img"
                  />
                  <div className="related-body">
                    <p className="related-title">{r.title}</p>
                    <span className="related-time">{r.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="card art-sidebar-card">
            <div className="newsletter-title">Get Fleet's Weekly Brief</div>
            <p className="newsletter-desc">Join 94,000+ readers getting exclusive insights no AI service is producing.</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input type="email" placeholder="Email" className="input-field" style={{ flex: 1 }} />
              <button className="btn-primary" style={{ padding: '8px 12px', fontSize: '13px' }}>Go</button>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="article-footer">
        <div className="article-footer-brand">
          <span className="logo-text-landing">NewsSphere</span>
          <p>Redefining how you experience AI-driven personalized news.</p>
        </div>
        <div className="article-footer-links">
          <div>
            <h5>Platform</h5>
            <a href="#">Personalized Feed</a>
            <a href="#">Explore Topics</a>
            <a href="#">Advanced Search</a>
            <a href="#">All Summaries</a>
          </div>
          <div>
            <h5>Company</h5>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Press</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </AppLayout>
  );
}
