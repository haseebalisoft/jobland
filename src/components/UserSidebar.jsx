import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  Target,
  Settings,
  LogOut,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import './UserSidebar.css';

export default function UserSidebar() {
  const { logout } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const isActive = (p) => path === p || (p !== '/dashboard' && path.startsWith(p));

  return (
    <aside className="user-sidebar">
      <Link to="/dashboard" className="user-sidebar__brand">
        <img
          src="/logo.png"
          alt="HiredLogics"
          className="user-sidebar__logo"
        />
        <span className="user-sidebar__title">HiredLogics</span>
      </Link>
      <nav className="user-sidebar__nav">
        <Link
          to="/dashboard"
          className={`user-sidebar__link ${isActive('/dashboard') ? 'user-sidebar__link--active' : ''}`}
        >
          <LayoutDashboard size={20} /> Overview
        </Link>
        <Link
          to="/profile"
          className={`user-sidebar__link ${isActive('/profile') ? 'user-sidebar__link--active' : ''}`}
        >
          <User size={20} /> Profile
        </Link>
        <Link
          to="/onboarding"
          className={`user-sidebar__link ${isActive('/onboarding') ? 'user-sidebar__link--active' : ''}`}
        >
          <Target size={20} /> Job Preferences
        </Link>
        <Link
          to="/resume-maker"
          className={`user-sidebar__link ${isActive('/resume-maker') ? 'user-sidebar__link--active' : ''}`}
        >
          <FileText size={20} /> Resume Maker
        </Link>
        <Link
          to="/dashboard/help"
          className={`user-sidebar__link ${isActive('/dashboard/help') ? 'user-sidebar__link--active' : ''}`}
        >
          <MessageCircle size={20} /> Help
        </Link>
        <Link
          to="/settings"
          className={`user-sidebar__link ${isActive('/settings') ? 'user-sidebar__link--active' : ''}`}
        >
          <Settings size={20} /> Settings
        </Link>
      </nav>
      <div className="user-sidebar__footer">
        <button
          type="button"
          onClick={logout}
          className="user-sidebar__logout"
        >
          <LogOut size={20} /> Logout
        </button>
      </div>
    </aside>
  );
}
