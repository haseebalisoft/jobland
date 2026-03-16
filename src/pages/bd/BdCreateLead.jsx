import React, { useEffect, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../BdDashboard.css';

const theme = { primary: '#10B981', border: '#E2E8F0', bg: '#F1F5F9', cardBg: '#ffffff', text: '#0F172A', textMuted: '#64748B' };

export default function BdCreateLead() {
  const { user } = useAuth();
  const [myUsers, setMyUsers] = useState([]);
  const [myUsersLoading, setMyUsersLoading] = useState(false);
  const [myUsersError, setMyUsersError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newLead, setNewLead] = useState({ job_title: '', company_name: '', job_link: '', assigned_user_id: '' });

  const fetchMyUsers = () => {
    if (!user || (user.role !== 'bd' && user.role !== 'admin')) return;
    setMyUsersLoading(true);
    setMyUsersError('');
    api.get('/bd/my-users')
      .then((res) => setMyUsers(Array.isArray(res.data) ? res.data : []))
      .catch(() => {
        setMyUsers([]);
        setMyUsersError('Could not load assigned users. Please try again.');
      })
      .finally(() => setMyUsersLoading(false));
  };

  useEffect(() => {
    fetchMyUsers();
  }, [user]);

  const handleNewLeadChange = (e) => {
    const { name, value } = e.target;
    setNewLead((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLead.job_title || !newLead.company_name || !newLead.job_link) return;
    setCreating(true);
    try {
      const payload = { job_title: newLead.job_title, company_name: newLead.company_name, job_link: newLead.job_link };
      if (newLead.assigned_user_id?.trim()) payload.assigned_user_id = newLead.assigned_user_id.trim();
      await api.post('/leads', payload);
      setNewLead({ job_title: '', company_name: '', job_link: '', assigned_user_id: '' });
      alert('Lead created successfully.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create lead.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bd-content">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: theme.text, marginBottom: 8 }}>Create lead</h1>
      <p style={{ color: theme.textMuted, fontSize: 15, marginBottom: 28 }}>Add a new job lead and optionally assign it to a user.</p>

      <section>
        <h2 className="bd-section-title"><PlusCircle size={20} /> Create new lead</h2>
        <form
          onSubmit={handleCreateLead}
          style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>Job title *</label>
              <input
                name="job_title"
                placeholder="Job title"
                value={newLead.job_title}
                onChange={handleNewLeadChange}
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 14, background: theme.cardBg }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>Company *</label>
              <input
                name="company_name"
                placeholder="Company name"
                value={newLead.company_name}
                onChange={handleNewLeadChange}
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 14, background: theme.cardBg }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>Job link (URL) *</label>
            <input
              name="job_link"
              type="url"
              placeholder="https://..."
              value={newLead.job_link}
              onChange={handleNewLeadChange}
              required
              style={{ width: '100%', maxWidth: 500, padding: '12px 16px', borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 14, background: theme.cardBg }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>Assign to user (optional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <select
                name="assigned_user_id"
                value={newLead.assigned_user_id}
                onChange={handleNewLeadChange}
                style={{ minWidth: 260, padding: '12px 16px', borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 14, background: theme.cardBg }}
              >
                <option value="">Select user (assigned by admin)</option>
                {myUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
                ))}
              </select>
              <button type="button" onClick={fetchMyUsers} disabled={myUsersLoading} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${theme.border}`, background: myUsersLoading ? theme.bg : theme.cardBg, fontSize: 13, fontWeight: 600, cursor: myUsersLoading ? 'default' : 'pointer' }}>
                {myUsersLoading ? 'Refreshing…' : 'Refresh list'}
              </button>
            </div>
            {myUsers.length === 0 && !myUsersLoading && (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: theme.textMuted }}>No users assigned to you yet. Ask an admin to assign users from Admin → Users → Assign BD.</p>
            )}
            {myUsersError && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#b91c1c' }}>{myUsersError}</p>}
          </div>
          <button type="submit" disabled={creating} className="bd-primary-btn" style={{ alignSelf: 'flex-start', padding: '12px 22px', borderRadius: 12, border: 'none', background: theme.primary, color: '#fff', fontSize: 14, fontWeight: 600, cursor: creating ? 'default' : 'pointer' }}>
            {creating ? 'Creating…' : 'Add lead'}
          </button>
        </form>
      </section>
    </div>
  );
}
