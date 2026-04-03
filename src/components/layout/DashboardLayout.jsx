import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import DashboardNavbar from './DashboardNavbar.jsx';
import DashboardSidebar from './DashboardSidebar.jsx';
import './DashboardLayout.css';

export default function DashboardLayout({
  children,
  userName = '',
  userInitials = 'U',
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const on = () => setIsNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (!isNarrow) setMobileOpen(false);
  }, [isNarrow]);

  return (
    <div className="dl-root">
      <DashboardNavbar
        displayName={userName}
        initials={userInitials}
        onMenuClick={isNarrow ? () => setMobileOpen((v) => !v) : undefined}
      />
      <div className="dl-body">
        <div
          className={`dl-sidebar-wrap${collapsed ? ' collapsed' : ''}${isNarrow && !mobileOpen ? ' mobile-hidden' : ''}`}
        >
          <DashboardSidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        </div>
        {isNarrow && mobileOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.35)',
              zIndex: 44,
              border: 'none',
              cursor: 'pointer',
            }}
          />
        )}
        <main className="dl-main">{children}</main>
      </div>
      <button type="button" className="dl-fab" aria-label="Chat">
        <span className="dl-fab__dot" />
        <MessageCircle size={24} />
      </button>
    </div>
  );
}
