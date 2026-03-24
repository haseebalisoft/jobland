import React, { useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../BdDashboard.css';

const theme = { text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff' };

export default function BdAssignedProfiles() {
  const { user } = useAuth();
  const [myUsers, setMyUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyUsers = () => {
    if (!user || (user.role !== 'bd' && user.role !== 'admin')) return;
    setLoading(true);
    setError('');
    api.get('/bd/my-users')
      .then((res) => setMyUsers(Array.isArray(res.data) ? res.data : []))
      .catch(() => {
        setMyUsers([]);
        setError('Could not load assigned users. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMyUsers();
  }, [user]);

  return (
    <div className="bd-content">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: theme.text, marginBottom: 8 }}>Assigned profiles</h1>
      <p style={{ color: theme.textMuted, fontSize: 15, marginBottom: 28 }}>
        Users assigned to you by admin. Only these users can receive leads from you.
      </p>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 className="bd-section-title" style={{ marginBottom: 0 }}><Users size={20} /> Assigned profiles</h2>
          <button
            type="button"
            onClick={fetchMyUsers}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: `1px solid ${theme.border}`, background: theme.cardBg, fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: theme.textMuted }}>Loading…</p>
        ) : error ? (
          <p style={{ color: '#b91c1c' }}>{error}</p>
        ) : myUsers.length === 0 ? (
          <div style={{ background: theme.cardBg, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 28 }}>
            <p style={{ margin: 0, fontSize: 14, color: theme.textMuted }}>
              No profiles assigned to you yet. Ask an admin to assign users to you from the Admin Dashboard (Users → Assign BD).
            </p>
          </div>
        ) : (
          <div style={{ borderRadius: 16, border: `1px solid ${theme.border}`, overflow: 'hidden', background: theme.cardBg, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <div className="bd-table-wrap">
            <table className="bd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#1E293B' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Primary profile title</th>
                </tr>
              </thead>
              <tbody>
                {myUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>{u.full_name || u.name || '—'}</td>
                    <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>{u.email}</td>
                    <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>{u.profile_title || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
