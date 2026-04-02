import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Users, Briefcase, Shield, FileText, LogOut, Lock, Menu, X } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../AdminDashboard.css';

const navItems = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/plans', end: false, icon: CreditCard, label: 'Plans' },
  { to: '/admin/users', end: false, icon: Users, label: 'Users' },
  { to: '/admin/leads', end: false, icon: Briefcase, label: 'Leads' },
  { to: '/admin/bds', end: false, icon: Shield, label: 'BDs' },
  { to: '/admin/subscriptions', end: false, icon: FileText, label: 'Subscriptions' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const onChange = () => {
      if (mq.matches) setSidebarOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-mobile-bar">
        <button
          type="button"
          className="admin-mobile-bar__menu"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>
        <span className="admin-mobile-bar__title">Admin Portal</span>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__top">
          <Link to="/" className="admin-sidebar__logo" onClick={() => setSidebarOpen(false)}>
            <img src="/logo.png" alt="HiredLogics" />
            <span className="admin-sidebar__logo-text">HiredLogics</span>
          </Link>
          <button
            type="button"
            className="admin-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={22} />
          </button>
        </div>
        <div className="admin-sidebar__sub">Admin Portal</div>
        {user && (
          <div className="admin-sidebar__user-hint">
            Logged in as <strong>{user.email}</strong>
          </div>
        )}
        <nav className="admin-sidebar__nav">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-sidebar__nav-item${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <button
            type="button"
            className="admin-sidebar__btn"
            onClick={async () => {
              const current = window.prompt('Enter your current password:');
              if (!current) return;
              const newPwd = window.prompt('Enter new password (min 6 chars):');
              if (!newPwd) return;
              try {
                await api.put('/settings/password', { current_password: current, new_password: newPwd });
                alert('Password updated.');
              } catch (e) {
                alert(e.response?.data?.message || 'Failed');
              }
            }}
          >
            <Lock size={18} />
            Change password
          </button>
          <button type="button" className="admin-sidebar__btn" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
