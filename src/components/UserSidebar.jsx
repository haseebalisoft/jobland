import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  Target,
  CheckCircle,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const theme = {
  primary: '#0d9488',
  teal: '#14b8a6',
  slate: '#0f172a',
  slateLight: '#1e293b',
};

const navItemStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 10,
  background: active ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
  color: active ? theme.teal : 'rgba(255,255,255,0.85)',
  fontWeight: active ? 600 : 500,
  textDecoration: 'none',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
});

export default function UserSidebar() {
  const { logout } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside
      style={{
        width: 260,
        background: `linear-gradient(180deg, ${theme.slate} 0%, ${theme.slateLight} 100%)`,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
      }}
    >
      <Link
        to="/dashboard"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 32,
          textDecoration: 'none',
        }}
      >
        <img
          src="/logo.png"
          alt="HiredLogics"
          style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }}
        />
        <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>HiredLogics</span>
      </Link>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link to="/dashboard" style={navItemStyle(path === '/dashboard')}>
          <LayoutDashboard size={20} /> Overview
        </Link>
        <Link to="/profile" style={navItemStyle(path === '/profile')}>
          <User size={20} /> Profile
        </Link>
        <Link to="/onboarding" style={navItemStyle(path === '/onboarding')}>
          <Target size={20} /> Job Preferences
        </Link>
        <Link to="/resume-maker" style={navItemStyle(path === '/resume-maker')}>
          <FileText size={20} /> Resume Maker
        </Link>
        <Link to="/settings" style={navItemStyle(path === '/settings')}>
          <Settings size={20} /> Settings
        </Link>
      </nav>
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <button
          type="button"
          onClick={logout}
          style={navItemStyle(false)}
        >
          <LogOut size={20} /> Logout
        </button>
      </div>
    </aside>
  );
}
