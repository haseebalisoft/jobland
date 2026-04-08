import { useState, useEffect } from 'react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import './DashboardLayout.css';

export default function DashboardLayout({
  children,
  userName = '',
  userInitials = 'U',
  /** Slightly narrower sidebar (~190px) for Job Tracker layout */
  narrowSidebar = false,
  /** Full-width main (e.g. resume editor) — hides sidebar */
  hideSidebar = false,
  /** Extra class on `<main>` (e.g. `dl-main--editor-fill`) */
  mainClassName = '',
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
    <div className={`dl-root${narrowSidebar ? ' dl-root--jt' : ''}${hideSidebar ? ' dl-root--editor' : ''}`}>
      <Navbar
        displayName={userName}
        initials={userInitials}
        onMenuClick={!hideSidebar && isNarrow ? () => setMobileOpen((v) => !v) : undefined}
      />
      <div className={`dl-body${hideSidebar ? ' dl-body--no-sidebar' : ''}`}>
        {!hideSidebar && (
        <div
          className={`dl-sidebar-wrap${collapsed ? ' collapsed' : ''}${isNarrow && !mobileOpen ? ' mobile-hidden' : ''}`}
        >
          <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
        </div>
        )}
        {isNarrow && mobileOpen && !hideSidebar && (
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
        <main className={`dl-main${mainClassName ? ` ${mainClassName}` : ''}`}>{children}</main>
      </div>
    </div>
  );
}
