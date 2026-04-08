import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Menu, Search, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import ProfileDropdown from './ProfileDropdown.jsx';

export default function Navbar({ displayName = '', initials = 'U', onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const name = displayName || user?.name || 'User';
  const email = user?.email || '';

  const onLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/login');
  };

  return (
    <header className="dl-nav">
      <div className="dl-nav__left">
        {onMenuClick ? (
          <button type="button" className="dl-nav__menu" aria-label="Open menu" onClick={onMenuClick}>
            <Menu size={18} />
          </button>
        ) : null}
        <div className="dl-nav__search">
          <Search size={15} />
          <input placeholder="Search jobs, resumes..." />
        </div>
      </div>

      <div className="dl-nav__right">
        <button type="button" className="dl-nav__icon-btn" aria-label="Notifications">
          <Bell size={17} />
          <span className="dl-nav__notif-dot" />
        </button>
        <Link to="/checkout" className="dl-nav__upgrade">
          <Star size={15} />
          <span>Upgrade to Premium</span>
        </Link>

        <div className="dl-nav__profile-wrap" ref={wrapRef}>
          <button type="button" className="dl-nav__profile-pill" onClick={() => setOpen((v) => !v)}>
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
