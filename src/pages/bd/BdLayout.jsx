import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { BarChart2, PlusCircle, Users, Briefcase, LogOut, Lock, Key, MessageCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../BdDashboard.css';

const theme = { primary: '#10B981', blue: '#2563EB', text: '#0F172A', textMuted: '#64748B' };

const navItems = [
  { to: '/bd', end: true, icon: BarChart2, label: 'Dashboard' },
  { to: '/bd/create-lead', end: false, icon: PlusCircle, label: 'Create lead' },
  { to: '/bd/assigned-profiles', end: false, icon: Users, label: 'Assigned profiles' },
  { to: '/bd/leads', end: false, icon: Briefcase, label: 'Your leads' },
  { to: '/bd/help', end: false, icon: MessageCircle, label: 'Help' },
];

export default function BdLayout() {
  const { user, logout } = useAuth();
  const [oneClickKeyLoading, setOneClickKeyLoading] = useState(false);

  if (!user) return null;
  if (user.role !== 'bd' && user.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', padding: 40, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 16, color: theme.textMuted }}>This BD portal is only available for BD or admin roles.</p>
      </div>
    );
  }

  const initials = (user.name || '').split(' ').filter(Boolean).map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'BD';

  return (
    <div className="bd-page">
      <aside className="bd-sidebar">
        <Link to="/" className="bd-sidebar__logo">
          <img src="/logo.png" alt="HiredLogics" />
          <span className="bd-sidebar__logo-text">HiredLogics</span>
        </Link>
        <div className="bd-sidebar__sub">BD Portal</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginBottom: 24 }}>
          Logged in as <strong>{user.email}</strong>
        </div>
        <nav className="bd-sidebar__nav">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `bd-sidebar__nav-item${isActive ? ' active' : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="bd-sidebar__footer">
          <button
            type="button"
            className="bd-sidebar-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, fontSize: 14, color: 'rgba(255,255,255,0.88)', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            disabled={oneClickKeyLoading}
            onClick={async () => {
              setOneClickKeyLoading(true);
              try {
                const { data } = await api.get('/bd/oneclick-token');
                const key = data.oneclick_api_key;
                await navigator.clipboard.writeText(key);
                alert('Capture API key copied to clipboard. Paste it in the extension Settings (API Key).');
              } catch (e) {
                alert(e.response?.data?.message || 'Failed to get API key');
              } finally {
                setOneClickKeyLoading(false);
              }
            }}
          >
            <Key size={18} />
            {oneClickKeyLoading ? 'Copying…' : 'Copy Capture API key'}
          </button>
          <button
            type="button"
            className="bd-sidebar-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, fontSize: 14, color: 'rgba(255,255,255,0.88)', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
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
          <button
            type="button"
            className="bd-sidebar-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, fontSize: 14, color: 'rgba(255,255,255,0.88)', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={logout}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>
      <main className="bd-main">
        <header className="bd-header">
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>BD Portal</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 14, color: theme.textMuted }}>{user.name || 'BD'}</span>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${theme.blue} 0%, ${theme.primary} 100%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{initials}</div>
          </div>
        </header>
        <div className="bd-main__body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
