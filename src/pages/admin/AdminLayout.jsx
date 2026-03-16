import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Users, Briefcase, Shield, FileText, LogOut, Lock } from 'lucide-react';
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

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-sidebar__logo">
          <img src="/logo.png" alt="HiredLogics" />
          <span className="admin-sidebar__logo-text">HiredLogics</span>
        </Link>
        <div className="admin-sidebar__sub">Admin Portal</div>
        {user && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginBottom: 24 }}>
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
