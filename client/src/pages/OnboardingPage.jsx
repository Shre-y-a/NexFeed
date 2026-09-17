import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Cpu, Briefcase, Globe, Zap as ZapIcon, HeartPulse, Palette, Heart, Shield, Star } from 'lucide-react';
import './OnboardingPage.css';

const categories = [
  { id: 'technology', icon: Cpu, label: 'Technology', desc: 'AI, Gadgets, Software' },
  { id: 'business', icon: Briefcase, label: 'Business', desc: 'Finance, Markets, Startups' },
  { id: 'world', icon: Globe, label: 'World News', desc: 'Politics, Global Events' },
  { id: 'science', icon: ZapIcon, label: 'Science', desc: 'Space, Research, Biotech' },
  { id: 'health', icon: HeartPulse, label: 'Health', desc: 'Wellness, Medicine' },
  { id: 'design', icon: Palette, label: 'Design', desc: 'UI/UX, Architecture' },
  { id: 'sports', icon: Heart, label: 'Sports', desc: 'Football, F1, Olympics' },
  { id: 'politics', icon: Shield, label: 'Politics', desc: 'Policy, Elections' },
];

export default function OnboardingPage() {
  const [selected, setSelected] = useState(['technology']);
  const navigate = useNavigate();

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (selected.length >= 3) {
      navigate('/feed');
    }
  };

  return (
    <div className="onboarding-page">
      {/* Topbar */}
      <header className="onboarding-header">
        <div className="onboarding-logo">
          <div className="logo-icon-sm"><Zap size={14} color="#4f6ef7" /></div>
          <span className="logo-text-landing">NewsSphere</span>
        </div>
        <div className="onboarding-header-right">
          <span className="already-text">Already have an account?</span>
          <Link to="/login" className="sign-in-link">Sign In</Link>
        </div>
      </header>

      <div className="onboarding-body">
        {/* Left — Steps & Categories */}
        <div className="onboarding-left">
          {/* Steps */}
          <div className="steps-bar">
            {[1, 2, 3].map((step) => (
              <div key={step} className="step-item">
                <div className={`step-line ${step === 1 ? 'active' : ''}`} />
                <span className="step-label">STEP 0{step}</span>
              </div>
            ))}
          </div>

          {/* Category selection */}
          <div className="onboarding-card">
            <h2 className="onboarding-title">Tailor your universe.</h2>
            <p className="onboarding-desc">Select at least 3 categories that define your daily curiosity.</p>

            <div className="category-grid">
              {categories.map(({ id, icon: Icon, label, desc }) => (
                <button
                  key={id}
                  className={`category-tile ${selected.includes(id) ? 'selected' : ''}`}
                  onClick={() => toggle(id)}
                  aria-pressed={selected.includes(id)}
                >
                  {selected.includes(id) && <span className="category-check">✓</span>}
                  <div className="category-icon">
                    <Icon size={22} />
                  </div>
                  <div className="category-label">{label}</div>
                  <div className="category-desc">{desc}</div>
                </button>
              ))}
            </div>

            <div className="onboarding-actions">
              <button className="btn-ghost">Skip</button>
              <button
                className="btn-primary"
                onClick={handleNext}
                disabled={selected.length < 3}
                style={{ opacity: selected.length < 3 ? 0.5 : 1 }}
              >
                Next Step →
              </button>
            </div>
          </div>
        </div>

        {/* Right — Live Feed Preview */}
        <div className="onboarding-right">
          <div className="feed-preview-card">
            <div className="feed-preview-header">
              <span className="feed-preview-title">LIVE FEED PREVIEW</span>
              <div className="feed-preview-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
            </div>
            <div className="preview-article">
              <div className="preview-article-tag">
                <span className="tag badge-blue">Technology</span>
                <span className="preview-source">Wired</span>
              </div>
              <div className="preview-article-img-wrap">
                <img
                  src="https://picsum.photos/seed/ai-computing-2024/400/180"
                  alt="AI Computing"
                  className="preview-article-img-real"
                />
              </div>
              <p className="preview-article-title">The Quantum Leap: How AI is Reshaping Computing in 2024</p>
              <div className="preview-article-bar" />
            </div>
          </div>

          <div className="ai-match-card">
            <div className="ai-match-icon">
              <Star size={20} color="#fbbf24" />
            </div>
            <div className="ai-match-info">
              <div className="ai-match-label">AI Match Score</div>
              <div className="ai-match-score">94%</div>
              <div className="ai-match-bar">
                <div className="ai-match-fill" style={{ width: '94%' }} />
              </div>
            </div>
          </div>

          <div className="privacy-card">
            <div className="privacy-icon">🛡️</div>
            <div>
              <div className="privacy-title">Privacy Guaranteed</div>
              <div className="privacy-desc">Your data is only used for local AI tuning.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
