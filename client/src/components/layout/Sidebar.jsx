import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Compass, Bookmark, BarChart2, User, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
  { to: '/feed', icon: LayoutGrid, label: 'For You' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <NavLink to="/feed" className="logo-link">
          <div className="logo-icon">
            <Zap size={16} color="#4f6ef7" />
          </div>
          <span className="logo-text">NewsSphere</span>
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="premium-card">
          <div className="premium-label">PREMIUM</div>
          <p className="premium-desc">Unlock AI deep summaries &amp; advanced analytics.</p>
          <button className="premium-btn">Upgrade</button>
        </div>

        <button className="nav-item logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
