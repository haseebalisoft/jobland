import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = { text: '#0F172A', textMuted: '#64748B' };

export default function AdminBds() {
  const [bds, setBds] = useState([]);

  useEffect(() => {
    api.get('/admin/bds').then((res) => setBds(res.data || [])).catch(() => setBds([]));
  }, []);

  const resetPassword = async (bd) => {
    const pwd = window.prompt(`Enter new password for ${bd.full_name || bd.email}:`);
    if (!pwd) return;
    try {
      await api.post(`/admin/users/${bd.id}/reset-password`, { password: pwd });
      alert('Password reset successfully.');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to reset password');
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
          <p className="admin-helper">Reset passwords here.</p>
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
                      <button type="button" className="admin-btn-secondary" onClick={() => resetPassword(bd)}>Reset password</button>
                    </td>
                  </tr>
                ))}
                {bds.length === 0 && <tr><td colSpan={3} className="admin-empty">No BD accounts yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
