import React, { useEffect, useState } from 'react';
import { User, Lock, CheckCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../BdDashboard.css';

const theme = { text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff', primary: '#10B981' };

export default function BdSettings() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let isMounted = true;
    api.get('/settings')
      .then((res) => {
        if (!isMounted) return;
        const u = res.data?.user || {};
        setFullName(u.full_name || '');
        setEmail(u.email || '');
      })
      .catch((err) => {
        if (!isMounted) return;
        setMessage(err.response?.data?.message || 'Failed to load settings');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveName = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage('');
    try {
      const res = await api.put('/settings/profile', { full_name: fullName });
      if (res.data?.user) setUser(res.data.user);
      setMessage('Name updated successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to update name');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setMessage('');
    try {
      await api.put('/settings/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password changed successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bd-content">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: theme.text }}>BD Settings</h1>
        <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
          Manage your profile and password in one place.
        </p>
      </div>

      {message && (
        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, background: '#f8fafc', color: theme.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          {message.toLowerCase().includes('success') && <CheckCircle size={16} color={theme.primary} />}
          <span style={{ fontSize: 14 }}>{message}</span>
        </div>
      )}

      {loading ? (
        <div style={{ color: theme.textMuted, fontSize: 14 }}>Loading settings...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <section style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <User size={18} color={theme.primary} />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text }}>Profile</h2>
            </div>
            <form onSubmit={handleSaveName} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Full name</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Email</span>
                <input value={email} disabled style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#f8fafc' }} />
              </label>
              <button type="submit" disabled={savingProfile} className="btn-next" style={{ marginTop: 6 }}>
                {savingProfile ? 'Saving...' : 'Save name'}
              </button>
            </form>
          </section>

          <section style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Lock size={18} color="#2563EB" />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text }}>Password</h2>
            </div>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Current password</span>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>New password</span>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14 }} />
              </label>
              <button type="submit" disabled={savingPassword} className="btn-next" style={{ marginTop: 6 }}>
                {savingPassword ? 'Updating...' : 'Change password'}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
