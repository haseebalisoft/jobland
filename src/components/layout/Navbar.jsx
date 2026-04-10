import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, Search, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import ProfileDropdown from './ProfileDropdown.jsx';
import NotificationDropdown from './NotificationDropdown.jsx';
import { useNavbarNotifications } from '../../hooks/useNavbarNotifications.js';

export default function Navbar({ displayName = '', initials = 'U', onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const wrapRef = useRef(null);
  const notifRef = useRef(null);

  const {
    loading: notifLoading,
    clearing: notifClearing,
    supportUnread,
    conversations,
    pendingTasks,
    refresh: refreshNotifs,
    clearAll: clearAllNotifs,
  } = useNavbarNotifications(!!user);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const name = displayName || user?.name || 'User';
  const email = user?.email || '';

  const onLogout = async () => {
    await logout();
    setOpen(false);
    setNotifOpen(false);
    navigate('/login');
  };

  const showNotifDot =
    supportUnread > 0 ||
    pendingTasks.length > 0 ||
    conversations.some((c) => c.unread);

  const toggleNotifs = () => {
    setOpen(false);
    setNotifOpen((v) => {
      const next = !v;
      if (next) refreshNotifs();
      return next;
    });
  };

  return (
    <header className="dl-nav">
      <div className="dl-nav__left">
        {onMenuClick ? (
          <button type="button" className="dl-nav__menu" aria-label="Open menu" onClick={onMenuClick}>
            <Menu size={18} />
          </button>
        ) : null}
      </div>

      <div className="dl-nav__center">
        <div className="dl-nav__search">
          <Search size={15} />
          <input placeholder="Search jobs, resumes..." aria-label="Search jobs and resumes" />
        </div>
      </div>

      <div className="dl-nav__right">
        <div className="dl-notif-wrap" ref={notifRef}>
          <button
            type="button"
            className="dl-nav__icon-btn"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
            onClick={toggleNotifs}
          >
            <Bell size={17} />
            {showNotifDot ? <span className="dl-nav__notif-dot" aria-hidden /> : null}
          </button>
          <NotificationDropdown
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            loading={notifLoading}
            clearing={notifClearing}
            supportUnread={supportUnread}
            conversations={conversations}
            pendingTasks={pendingTasks}
            onAfterNavigate={refreshNotifs}
            onClearAll={clearAllNotifs}
          />
        </div>
        <Link to="/checkout" className="dl-nav__upgrade">
          <Star size={15} />
          <span>Upgrade to Premium</span>
        </Link>

        <div className="dl-nav__profile-wrap" ref={wrapRef}>
          <button
            type="button"
            className="dl-nav__profile-pill"
            onClick={() => {
              setNotifOpen(false);
              setOpen((v) => !v);
            }}
          >
            <span className="dl-nav__avatar">{(initials || 'U').slice(0, 2)}</span>
            <span className="dl-nav__profile-name">{name}</span>
            <ChevronDown size={16} />
          </button>
          <ProfileDropdown open={open} onClose={() => setOpen(false)} name={name} email={email} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
