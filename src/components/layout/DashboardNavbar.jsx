import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, ChevronDown, Menu } from 'lucide-react';

export default function DashboardNavbar({
  displayName = '',
  initials = 'U',
  onMenuClick,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <header className="dl-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onMenuClick ? (
          <button
            type="button"
            className="dl-nav__chevron"
            aria-label="Open menu"
            onClick={onMenuClick}
            style={{ color: '#fff' }}
          >
            <Menu size={22} />
          </button>
        ) : null}
        <Link to="/dashboard" className="dl-nav__brand">
          <img src="/logo.png" alt="Hirdlogic" className="dl-nav__logo" />
          Hirdlogic
        </Link>
      </div>
      <div className="dl-nav__right">
        <Link to="/checkout" className="dl-nav__upgrade">
          <Star size={16} strokeWidth={2.2} />
          Upgrade to Premium
        </Link>
        <div className="dl-nav__user" ref={ref}>
          <div className="dl-nav__avatar">{initials}</div>
          <span className="dl-nav__name">{displayName || 'User'}</span>
          <button
            type="button"
            className="dl-nav__chevron"
            aria-expanded={open}
            aria-label="Account menu"
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown size={18} />
          </button>
          {open && (
            <div className="dl-nav__dropdown">
              <Link to="/settings" style={{ display: 'block', padding: '10px 12px', textDecoration: 'none', color: 'inherit', borderRadius: 6 }} onClick={() => setOpen(false)}>
                Settings
              </Link>
              <Link to="/billing" style={{ display: 'block', padding: '10px 12px', textDecoration: 'none', color: 'inherit', borderRadius: 6 }} onClick={() => setOpen(false)}>
                Billing
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
