/**
 * /auth/callback
 * Google OAuth redirect lands here with ?token=...&username=...&email=...
 * We extract the token, store it, update AuthContext, then redirect to /feed.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap } from 'lucide-react';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing your sign-in…');

  useEffect(() => {
    const token      = searchParams.get('token');
    const user_id    = searchParams.get('user_id');
    const username   = searchParams.get('username');
    const email      = searchParams.get('email');
    const avatar_url = searchParams.get('avatar_url');
    const error      = searchParams.get('error');

    if (error) {
      const msgs = {
        google_denied:          'Google sign-in was cancelled.',
        google_token_failed:    'Failed to verify with Google. Please try again.',
        google_userinfo_failed: 'Could not retrieve your Google profile.',
        google_db_error:        'Account setup failed. Please try again.',
      };
      setStatus(msgs[error] || 'Sign-in failed. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!token) {
      setStatus('Invalid callback. Redirecting…');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // Store token and user in AuthContext
    login({ user_id, username, email, avatar_url }, token);
    setStatus('Signed in! Redirecting to your feed…');
    navigate('/feed', { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      color: '#f0f0ff',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        width: 52, height: 52,
        background: 'rgba(79,110,247,0.15)',
        border: '1px solid rgba(79,110,247,0.3)',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Zap size={24} color="#4f6ef7" />
      </div>
      <p style={{ fontSize: 15, color: '#8888aa' }}>{status}</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: '#4f6ef7',
            animation: 'pulse 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}
