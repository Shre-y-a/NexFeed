import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Zap, GitFork } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import './AuthPages.css';

export default function SignupPage() {
  const [form, setForm]             = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPw,        setShowPw]  = useState(false);
  const [showConfirm,   setShowConfirm] = useState(false);
  const [agreed,        setAgreed]  = useState(true);
  const [error,         setError]   = useState('');
  const [loading,       setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  /* ── email/password register ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('Please agree to the terms.'); return; }
    setLoading(true);
    try {
      const data = await authApi.register({
        username: form.username,
        email:    form.email,
        password: form.password,
      });
      login(data.user, data.token);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth ── */
  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await authApi.loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in unavailable. Check server config.');
      setGoogleLoading(false);
    }
  };

  /* ── GitHub OAuth ── */
  const handleGitHub = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await authApi.loginWithGitHub();
    } catch (err) {
      setError(err.message || 'GitHub sign-in unavailable. Check server config.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── Left panel ── */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="logo-icon-auth"><Zap size={18} color="#4f6ef7" /></div>
          <span className="logo-text-auth">NewsSphere</span>
        </div>
        <h1 className="auth-hero-title">
          The Future of<br />
          <span className="auth-hero-accent">Information</span><br />
          Starts Here.
        </h1>
        <p className="auth-hero-desc">
          Join thousands of readers who experience news through the lens of personalized AI intelligence. Clean, fast, and remarkably smart.
        </p>
        <div className="auth-features">
          <div className="auth-feature-item">
            <div className="auth-feature-icon blue"><Zap size={16} /></div>
            <div>
              <div className="auth-feature-title">AI Deep Summaries</div>
              <div className="auth-feature-desc">Save time with instant core-insight extractions.</div>
            </div>
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-icon purple">🛡️</div>
            <div>
              <div className="auth-feature-title">Privacy-First Feed</div>
              <div className="auth-feature-desc">Your data belongs to you. No tracking, just news.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-card">
          <h2 className="auth-card-title">Create Your Sphere</h2>
          <p className="auth-card-subtitle">Start your journey into personalized discovery.</p>

          {/* OAuth buttons */}
          <div className="oauth-buttons">
            <button
              type="button"
              className="oauth-btn google-oauth-btn"
              onClick={handleGoogle}
              disabled={googleLoading || loading}
            >
              {googleLoading ? <span className="oauth-spinner" /> : <GoogleIcon />}
              {googleLoading ? 'Redirecting…' : 'Google'}
            </button>
            <button
              type="button"
              className="oauth-btn github-oauth-btn"
              onClick={handleGitHub}
              disabled={googleLoading || loading}
            >
              <GitHubIcon />
              GitHub
            </button>
          </div>

          <div className="auth-divider"><span>OR SIGN UP WITH EMAIL</span></div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">USERNAME</label>
              <div className="input-wrap">
                <User size={15} className="input-icon" />
                <input
                  type="text"
                  name="username"
                  placeholder="johndoe"
                  className="input-field"
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">EMAIL ADDRESS</label>
              <div className="input-wrap">
                <Mail size={15} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  className="input-field"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">PASSWORD</label>
              <div className="input-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  className="input-field"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-eye"
                  onClick={() => setShowPw(!showPw)}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">CONFIRM PASSWORD</label>
              <div className="input-wrap">
                <Lock size={15} className="input-icon" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="••••••••"
                  className="input-field"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-eye"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="checkbox-wrap">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="checkbox"
              />
              <label htmlFor="agree" className="checkbox-label">
                I agree to the{' '}
                <a href="#" className="text-link">Terms of Service</a> and{' '}
                <a href="#" className="text-link">Privacy Policy</a>.
              </label>
            </div>

            <button
              type="submit"
              className="btn-primary submit-btn"
              disabled={loading || googleLoading}
            >
              {loading ? 'Creating…' : 'Create Account →'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login" className="text-link">Sign In</Link>
          </p>

          <div className="auth-footer-badges">
            <span className="auth-badge">🛡️ ENTERPRISE GRADE SECURITY</span>
            <span className="auth-badge">⚡ SSL ENCRYPTED</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Google coloured SVG icon */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

/* GitHub mark SVG icon */
function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}
