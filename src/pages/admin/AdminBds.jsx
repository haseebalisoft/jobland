import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = { text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0' };

export default function AdminBds() {
  const [bds, setBds] = useState([]);
  const [resetPasswordModal, setResetPasswordModal] = useState(null);
  const [resetPasswordNew, setResetPasswordNew] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  useEffect(() => {
    api.get('/admin/bds').then((res) => setBds(res.data || [])).catch(() => setBds([]));
  }, []);

  const openResetPasswordModal = (bd) => {
    setResetPasswordModal(bd);
    setResetPasswordNew('');
    setResetPasswordConfirm('');
    setResetPasswordError('');
  };

  const submitResetPassword = async () => {
    if (!resetPasswordModal) return;
    if (!resetPasswordNew || resetPasswordNew.length < 6) {
      setResetPasswordError('Password must be at least 6 characters.');
      return;
    }
    if (resetPasswordNew !== resetPasswordConfirm) {
      setResetPasswordError('Passwords do not match.');
      return;
    }
    setResetPasswordSaving(true);
    setResetPasswordError('');
    try {
      await api.post(`/admin/users/${resetPasswordModal.id}/reset-password`, { password: resetPasswordNew });
      setResetPasswordModal(null);
      setResetPasswordNew('');
      setResetPasswordConfirm('');
      alert('Password changed successfully.');
    } catch (e) {
      setResetPasswordError(e.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetPasswordSaving(false);
    }
  };

  return (
    <>
      <header className="admin-header">
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>BDs</h1>
        <span style={{ fontSize: 14, color: theme.textMuted }}>BD accounts from the BD Portal</span>
      </header>
      <div className="admin-content">
        <section className="admin-section">
          <h2 className="admin-section-title"><Shield size={20} /> BDs</h2>
          <p className="admin-helper">Reset or change any BD&apos;s password. They can sign in with the new password immediately.</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bds.map((bd) => (
                  <tr key={bd.id}>
                    <td>{bd.full_name || bd.name || '—'}</td>
                    <td>{bd.email}</td>
                    <td>
                      <button type="button" className="admin-btn-secondary" onClick={() => openResetPasswordModal(bd)}>Reset / Change password</button>
                    </td>
                  </tr>
                ))}
                {bds.length === 0 && <tr><td colSpan={3} className="admin-empty">No BD accounts yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {resetPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setResetPasswordModal(null)}>
          <div className="admin-card" style={{ minWidth: 360, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: theme.text }}>Reset / Change password</h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: theme.textMuted }}>{resetPasswordModal.full_name || resetPasswordModal.name || resetPasswordModal.email}</p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>New password</label>
            <input type="password" value={resetPasswordNew} onChange={(e) => setResetPasswordNew(e.target.value)} className="admin-input" placeholder="Min 6 characters" style={{ width: '100%', marginBottom: 12 }} autoComplete="new-password" />
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>Confirm password</label>
            <input type="password" value={resetPasswordConfirm} onChange={(e) => setResetPasswordConfirm(e.target.value)} className="admin-input" placeholder="Re-enter password" style={{ width: '100%', marginBottom: 12 }} autoComplete="new-password" />
            {resetPasswordError && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{resetPasswordError}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="admin-btn-secondary" onClick={() => setResetPasswordModal(null)}>Cancel</button>
              <button type="button" className="admin-btn-primary" onClick={submitResetPassword} disabled={resetPasswordSaving}>{resetPasswordSaving ? 'Saving…' : 'Change password'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
