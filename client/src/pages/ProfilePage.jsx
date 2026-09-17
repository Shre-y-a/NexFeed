import { useState, useEffect } from 'react';
import { User, Shield, Loader, Check, AlertCircle, Eye, EyeOff, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { userApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

export default function ProfilePage() {
  const { logout, user: authUser } = useAuth();
  const navigate = useNavigate();

  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('profile');

  useEffect(() => {
    userApi.getProfile()
      .then(d => setProfile(d.user))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, color: 'var(--text-secondary)' }}>
        <Loader size={22} style={{ animation: 'spin-p 0.8s linear infinite' }} />
        Loading profile…
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="profile-page page-container">
        <h1 className="section-title">Settings &amp; Account</h1>
        <p className="section-subtitle">Manage your profile and account security.</p>

        <div className="profile-layout">
          {/* ── Tab nav ── */}
          <nav className="profile-tabs-nav">
            {[
              { id: 'profile',  label: 'Profile',  icon: User   },
              { id: 'security', label: 'Security', icon: Shield },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`profile-tab-btn ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}

            <button className="profile-tab-btn logout-tab" onClick={handleLogout}>
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </nav>

          {/* ── Content ── */}
          <div className="profile-content">
            {activeTab === 'profile' && profile && (
              <ProfileTab profile={profile} onUpdated={setProfile} />
            )}
            {activeTab === 'security' && profile && (
              <SecurityTab profile={profile} />
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

/* ── Profile Tab ─────────────────────────────────────────────────────────── */
function ProfileTab({ profile, onUpdated }) {
  const { login, token } = useAuth();
  const [form,    setForm]    = useState({ username: profile.username || '', email: profile.email || '' });
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null); // {type:'success'|'error', text}
  const [changed, setChanged] = useState(false);

  const isDirty = form.username !== profile.username || form.email !== (profile.email || '');

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await userApi.updateProfile({ username: form.username, email: form.email || null });
      const updated = { ...profile, username: form.username, email: form.email || null };
      onUpdated(updated);
      // Update AuthContext so header shows new username
      login(updated, token);
      setMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Update failed.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({ username: profile.username || '', email: profile.email || '' });
    setMsg(null);
  };

  const avatarSeed = profile.username || profile.user_id || 'user';
  const avatarUrl  = profile.avatar_url?.startsWith('http')
    ? profile.avatar_url
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}`;

  return (
    <div className="profile-sections">

      {/* Account info card */}
      <div className="card profile-section-card">
        <h3 className="profile-section-title">Account Information</h3>
        <p className="profile-section-desc">Your account details on NewsSphere.</p>

        <div className="account-info-layout">
          {/* Avatar */}
          <img src={avatarUrl} alt="Avatar" className="profile-avatar-lg" />

          {/* Read-only info */}
          <div className="account-info-grid">
            <InfoRow label="User ID" value={profile.user_id} mono />
            <InfoRow label="Sign-in method"
              value={profile.auth_provider === 'google' ? '🔵 Google' : '🔑 Email & Password'} />
            <InfoRow label="Member since"
              value={profile.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : '—'} />
            <InfoRow label="Last active"
              value={profile.last_login
                ? new Date(profile.last_login).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—'} />
          </div>
        </div>
      </div>

      {/* Editable details card */}
      <div className="card profile-section-card">
        <h3 className="profile-section-title">Edit Profile</h3>
        <p className="profile-section-desc">Update your username and email address.</p>

        {msg && (
          <div className={`profile-msg ${msg.type}`}>
            {msg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
            {msg.text}
          </div>
        )}

        <div className="profile-form">
          <div className="form-group">
            <label className="form-label">USERNAME</label>
            <input
              type="text"
              className="input-field"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="your_username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">EMAIL ADDRESS</label>
            <input
              type="email"
              className="input-field"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              autoComplete="email"
              disabled={profile.auth_provider === 'google'}
            />
            {profile.auth_provider === 'google' && (
              <p className="form-hint">Email is managed by Google and cannot be changed here.</p>
            )}
          </div>

          <div className="form-actions">
            <button
              className="btn-secondary"
              onClick={handleReset}
              disabled={saving || !isDirty}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              Reset
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving || !isDirty}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              {saving ? <Loader size={13} style={{ animation: 'spin-p 0.8s linear infinite' }} /> : null}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Security Tab ────────────────────────────────────────────────────────── */
function SecurityTab({ profile }) {
  const [form,   setForm]   = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState(null);

  const isGoogle = profile.auth_provider === 'google';

  const handleChange = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (form.new_password !== form.confirm_password) {
      setMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (form.new_password.length < 6) {
      setMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setSaving(true);
    try {
      await userApi.changePassword({
        current_password: form.current_password,
        new_password:     form.new_password,
      });
      setMsg({ type: 'success', text: 'Password changed successfully.' });
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Failed to change password.' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (field) => setShowPw(p => ({ ...p, [field]: !p[field] }));

  return (
    <div className="profile-sections">
      <div className="card profile-section-card">
        <h3 className="profile-section-title">Change Password</h3>
        <p className="profile-section-desc">Update your login password.</p>

        {isGoogle ? (
          <div className="profile-msg info">
            <AlertCircle size={14} />
            You signed in with Google — no password to change. Manage your password at{' '}
            <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer"
              className="text-link">myaccount.google.com</a>.
          </div>
        ) : (
          <form onSubmit={handleChange} className="profile-form">
            {msg && (
              <div className={`profile-msg ${msg.type}`}>
                {msg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                {msg.text}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">CURRENT PASSWORD</label>
              <div className="pw-wrap">
                <input
                  type={showPw.current ? 'text' : 'password'}
                  className="input-field"
                  value={form.current_password}
                  onChange={e => setForm({ ...form, current_password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="pw-eye" onClick={() => toggle('current')}>
                  {showPw.current ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">NEW PASSWORD</label>
              <div className="pw-wrap">
                <input
                  type={showPw.new ? 'text' : 'password'}
                  className="input-field"
                  value={form.new_password}
                  onChange={e => setForm({ ...form, new_password: e.target.value })}
                  placeholder="at least 6 characters"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <button type="button" className="pw-eye" onClick={() => toggle('new')}>
                  {showPw.new ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">CONFIRM NEW PASSWORD</label>
              <div className="pw-wrap">
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  className="input-field"
                  value={form.confirm_password}
                  onChange={e => setForm({ ...form, confirm_password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <button type="button" className="pw-eye" onClick={() => toggle('confirm')}>
                  {showPw.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={saving || !form.current_password || !form.new_password}
                style={{ fontSize: '13px', padding: '8px 20px' }}
              >
                {saving ? <Loader size={13} style={{ animation: 'spin-p 0.8s linear infinite' }} /> : null}
                {saving ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Danger zone */}
      <div className="card profile-section-card danger-card">
        <h3 className="profile-section-title danger-title">Account</h3>
        <p className="profile-section-desc">Your account is active on NewsSphere.</p>
        <div className="account-meta">
          <span className="account-meta-item">
            <span className="account-meta-label">Auth provider</span>
            <span className="account-meta-value">
              {profile.auth_provider === 'google' ? '🔵 Google OAuth' : '🔑 Email & Password'}
            </span>
          </span>
          <span className="account-meta-item">
            <span className="account-meta-label">Account status</span>
            <span className="account-meta-value active-badge">● Active</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Helper: read-only info row ──────────────────────────────────────────── */
function InfoRow({ label, value, mono }) {
  return (
    <div className="info-row">
      <span className="info-row-label">{label}</span>
      <span className={`info-row-value ${mono ? 'mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}
