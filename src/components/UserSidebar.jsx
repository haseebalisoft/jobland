import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  Layers,
  Target,
  Settings,
  LogOut,
  MessageCircle,
  Menu,
  X,
  Lock,
  Gauge,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { isFreePlanUser } from '../utils/subscription.js';
import './UserSidebar.css';

function pricingPath() {
  return { pathname: '/free-tools', search: '?upgrade=1' };
}

export default function UserSidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [open, setOpen] = useState(false);
  const free = isFreePlanUser(user);

  const isActive = (p) => path === p || (p !== '/dashboard' && path.startsWith(p));

  const goPricing = (e) => {
    e.preventDefault();
    navigate(pricingPath());
    setOpen(false);
  };

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

  const lockedLink = (to, icon, label) => (
    <button
      type="button"
      className="user-sidebar__link user-sidebar__link--locked"
      onClick={goPricing}
      title="Upgrade to unlock"
    >
      {icon}
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      <Lock size={16} style={{ opacity: 0.75 }} />
    </button>
  );

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
          <Link to={free ? '/free-tools' : '/dashboard'} className="user-sidebar__brand" onClick={close}>
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
            to="/free-tools"
            className={`user-sidebar__link ${isActive('/free-tools') ? 'user-sidebar__link--active' : ''}`}
            onClick={close}
          >
            <Gauge size={20} /> Score Resume
          </Link>
          {free ? (
            <>
              {lockedLink('/dashboard', <LayoutDashboard size={20} />, 'Overview')}
              {lockedLink('/dashboard/profile', <User size={20} />, 'Profile')}
              {lockedLink('/dashboard/job-preferences', <Target size={20} />, 'Job Preferences')}
              {lockedLink('/resume-maker', <FileText size={20} />, 'Resume Maker')}
              {lockedLink('/resumes', <Layers size={20} />, 'Resumes')}
              {lockedLink('/dashboard/help', <MessageCircle size={20} />, 'Help')}
              {lockedLink('/dashboard/settings', <Settings size={20} />, 'Settings')}
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                className={`user-sidebar__link ${isActive('/dashboard') ? 'user-sidebar__link--active' : ''}`}
                onClick={close}
              >
                <LayoutDashboard size={20} /> Overview
              </Link>
              <Link
                to="/dashboard/profile"
                className={`user-sidebar__link ${path === '/profile' || path === '/dashboard/profile' ? 'user-sidebar__link--active' : ''}`}
                onClick={close}
              >
                <User size={20} /> Profile
              </Link>
              <Link
                to="/dashboard/job-preferences"
                className={`user-sidebar__link ${path === '/onboarding' || path === '/dashboard/job-preferences' ? 'user-sidebar__link--active' : ''}`}
                onClick={close}
              >
                <Target size={20} /> Job Preferences
              </Link>
              <Link
                to="/resume-maker"
                className={`user-sidebar__link ${path === '/resume-maker' ? 'user-sidebar__link--active' : ''}`}
                onClick={close}
              >
                <FileText size={20} /> Resume Maker
              </Link>
              <Link
                to="/resumes"
                className={`user-sidebar__link ${path === '/resumes' ? 'user-sidebar__link--active' : ''}`}
                onClick={close}
              >
                <Layers size={20} /> Resumes
              </Link>
              <Link
                to="/dashboard/help"
                className={`user-sidebar__link ${isActive('/dashboard/help') ? 'user-sidebar__link--active' : ''}`}
                onClick={close}
              >
                <MessageCircle size={20} /> Help
              </Link>
              <Link
                to="/dashboard/settings"
                className={`user-sidebar__link ${path === '/settings' || path === '/dashboard/settings' ? 'user-sidebar__link--active' : ''}`}
                onClick={close}
              >
                <Settings size={20} /> Settings
              </Link>
            </>
          )}
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
