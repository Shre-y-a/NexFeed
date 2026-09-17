import { Bell, Search, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Topbar.css';

export default function Topbar({ placeholder = 'Search topics or articles...' }) {
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder={placeholder}
          className="topbar-input"
          onFocus={() => navigate('/explore')}
          readOnly
        />
      </div>

      <div className="topbar-brand">
        <div className="topbar-logo-icon">
          <Zap size={14} color="#4f6ef7" />
        </div>
        <span className="topbar-logo-text">NewsSphere</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notif-dot" />
        </button>
        <div className="avatar-wrap">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
            alt="User avatar"
            className="avatar"
          />
          <span className="online-dot" />
        </div>
      </div>
    </header>
  );
}
