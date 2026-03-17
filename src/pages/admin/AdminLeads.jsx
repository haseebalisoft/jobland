import React, { useEffect, useState } from 'react';
import { Briefcase, ExternalLink, Users } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B' };

export default function AdminLeads() {
  const [leads, setLeads] = useState({ items: [], total: 0 });
  const [leadStats, setLeadStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bds, setBds] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/leads/filter', { params: { range: 'all', limit: 200 } }).catch(() => ({ data: { items: [], total: 0 } })),
      api.get('/leads/stats').catch(() => ({ data: null })),
      api.get('/admin/users').catch(() => ({ data: [] })),
      api.get('/admin/bds').catch(() => ({ data: [] })),
    ]).then(([leadsRes, statsRes, usersRes, bdsRes]) => {
      setLeads(leadsRes.data || { items: [], total: 0 });
      setLeadStats(statsRes.data || null);
      setUsers(usersRes.data || []);
      setBds(bdsRes.data || []);
    });
  }, []);

  const openAssignModal = (lead) => {
    setAssignModal(lead);
    setAssignUserId(lead.assigned_user_id || '');
  };

  const closeAssignModal = () => {
    setAssignModal(null);
    setAssignUserId('');
  };

  const submitAssignUser = async () => {
    if (!assignModal || !assignUserId) return;
    setAssignSaving(true);
    try {
      const res = await api.patch(`/leads/${assignModal.id}/assign`, { assigned_user_id: assignUserId });
      setLeads((prev) => ({
        ...prev,
        items: (prev.items || []).map((l) => (l.id === res.data.id ? res.data : l)),
      }));
      closeAssignModal();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to change assigned user');
    } finally {
      setAssignSaving(false);
    }
  };

  const userLabel = (id) => {
    const u = (users || []).find((x) => x.id === id);
    if (!u) return 'Unassigned';
    return u.full_name || u.name || u.email || 'User';
  };

  const bdLabel = (id) => {
    const bd = (bds || []).find((x) => x.id === id);
    if (!bd) return '—';
    return bd.full_name || bd.name || bd.email || 'BD';
  };

  return (
    <>
      <header className="admin-header">
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Leads</h1>
        <span style={{ fontSize: 14, color: theme.textMuted }}>All job assignments</span>
      </header>
      <div className="admin-content">
        <section className="admin-section">
          <h2 className="admin-section-title"><Briefcase size={20} /> Leads (all)</h2>
          <p className="admin-helper">All job assignments across BDs. See which user each lead is assigned to and reassign if needed.</p>
          {leadStats && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="admin-tag">Total: {leadStats.total_leads ?? 0}</span>
              <span style={{ color: theme.textMuted }}>Pending: {leadStats.pending ?? 0}</span>
              <span style={{ color: theme.textMuted }}>Assigned: {leadStats.assigned ?? 0}</span>
              <span style={{ color: theme.primary }}>Completed: {leadStats.completed ?? 0}</span>
              <span style={{ color: '#F43F5E' }}>Failed: {leadStats.failed ?? 0}</span>
            </div>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Company</th>
                  <th>Assigned user</th>
                  <th>BD</th>
                  <th>Created</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {(leads.items || []).length === 0 ? (
                  <tr><td colSpan={6} className="admin-empty">No leads.</td></tr>
                ) : (
                  (leads.items || []).slice(0, 100).map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.job_title || '—'}</td>
                      <td>{lead.company_name || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span className="admin-tag">
                            <Users size={12} style={{ marginRight: 4 }} />
                            {userLabel(lead.assigned_user_id)}
                          </span>
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 12 }}
                            onClick={() => openAssignModal(lead)}
                          >
                            Change user
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="admin-tag">
                          {bdLabel(lead.bd_id)}
                        </span>
                      </td>
                      <td>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        {lead.job_link ? (
                          <a href={lead.job_link} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                            <ExternalLink size={14} /> Open
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {(leads.items || []).length > 100 && (
            <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 8 }}>Showing first 100 of {leads.total}.</p>
          )}
        </section>
      </div>
      {assignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={closeAssignModal}
        >
          <div
            className="admin-card"
            style={{ minWidth: 360, maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 18, color: theme.text }}>Change assigned user</h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: theme.textMuted }}>
              {assignModal.job_title || 'Job'} — {assignModal.company_name || 'Company'}
            </p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
              Select user
            </label>
            <select
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              className="admin-select"
              style={{ width: '100%', marginBottom: 16 }}
            >
              <option value="">Choose user…</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.full_name || u.name || u.email) + ' — ' + u.email}
                </option>
              ))}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="admin-btn-secondary" onClick={closeAssignModal} disabled={assignSaving}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={submitAssignUser}
                disabled={assignSaving || !assignUserId}
              >
                {assignSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
