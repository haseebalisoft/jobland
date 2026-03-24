import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  Target,
  Settings,
  LogOut,
  MessageCircle,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import './UserSidebar.css';

export default function UserSidebar() {
  const { logout } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const [open, setOpen] = useState(false);

  const isActive = (p) => path === p || (p !== '/dashboard' && path.startsWith(p));

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => setOpen(false);

  return (
    <div className="user-sidebar-root">
      <div className="user-mobile-bar">
        <button
          type="button"
          className="user-mobile-bar__menu"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
        <span className="user-mobile-bar__title">HiredLogics</span>
      </div>

      {open && (
        <button
          type="button"
          className="user-sidebar-overlay"
          aria-label="Close menu"
          onClick={close}
        />
      )}

      <aside className={`user-sidebar${open ? ' user-sidebar--open' : ''}`}>
        <div className="user-sidebar__top">
          <Link to="/dashboard" className="user-sidebar__brand" onClick={close}>
            <img
              src="/logo.png"
              alt="HiredLogics"
              className="user-sidebar__logo"
            />
            <span className="user-sidebar__title">HiredLogics</span>
          </Link>
          <button
            type="button"
            className="user-sidebar__close"
            onClick={close}
            aria-label="Close navigation"
          >
            <X size={22} />
          </button>
        </div>
        <nav className="user-sidebar__nav">
          <Link
            to="/dashboard"
            className={`user-sidebar__link ${isActive('/dashboard') ? 'user-sidebar__link--active' : ''}`}
            onClick={close}
          >
            <LayoutDashboard size={20} /> Overview
          </Link>
          <Link
            to="/profile"
            className={`user-sidebar__link ${isActive('/profile') ? 'user-sidebar__link--active' : ''}`}
            onClick={close}
          >
            <User size={20} /> Profile
          </Link>
          <Link
            to="/onboarding"
            className={`user-sidebar__link ${isActive('/onboarding') ? 'user-sidebar__link--active' : ''}`}
            onClick={close}
          >
            <Target size={20} /> Job Preferences
          </Link>
          <Link
            to="/resume-maker"
            className={`user-sidebar__link ${isActive('/resume-maker') ? 'user-sidebar__link--active' : ''}`}
            onClick={close}
          >
            <FileText size={20} /> Resume Maker
          </Link>
          <Link
            to="/dashboard/help"
            className={`user-sidebar__link ${isActive('/dashboard/help') ? 'user-sidebar__link--active' : ''}`}
            onClick={close}
          >
            <MessageCircle size={20} /> Help
          </Link>
          <Link
            to="/settings"
            className={`user-sidebar__link ${isActive('/settings') ? 'user-sidebar__link--active' : ''}`}
            onClick={close}
          >
            <Settings size={20} /> Settings
          </Link>
        </nav>
        <div className="user-sidebar__footer">
          <button
            type="button"
            onClick={() => {
              close();
              logout();
            }}
            className="user-sidebar__logout"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>
    </div>
  );
}
