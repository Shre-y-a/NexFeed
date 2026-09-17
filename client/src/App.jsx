import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import FeedPage from './pages/FeedPage';
import ExplorePage from './pages/ExplorePage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import BookmarksPage from './pages/BookmarksPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ProfilePage from './pages/ProfilePage';
import AuthCallbackPage from './pages/AuthCallbackPage';

// Guard: redirects to /login if not authenticated; shows nothing while rehydrating token
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0f' }} />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/"               element={<LandingPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/signup"         element={<SignupPage />} />
      <Route path="/onboarding"     element={<OnboardingPage />} />
      <Route path="/auth/callback"  element={<AuthCallbackPage />} />

      {/* Protected */}
      <Route path="/feed"        element={<PrivateRoute><FeedPage /></PrivateRoute>} />
      <Route path="/explore"     element={<PrivateRoute><ExplorePage /></PrivateRoute>} />
      <Route path="/article/:id" element={<PrivateRoute><ArticleDetailPage /></PrivateRoute>} />
      <Route path="/bookmarks"   element={<PrivateRoute><BookmarksPage /></PrivateRoute>} />
      <Route path="/analytics"   element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
      <Route path="/profile"     element={<PrivateRoute><ProfilePage /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
