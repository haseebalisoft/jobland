import React, { useEffect, useState } from 'react';
import { Briefcase, Filter, ExternalLink } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../BdDashboard.css';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 days' },
  { value: '7days', label: 'Last 7 days' },
  { value: '15days', label: 'Last 15 days' },
  { value: 'all', label: 'All time' },
];
const STATUS_OPTIONS = ['pending', 'assigned', 'completed', 'failed'];

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff' };

export default function BdYourLeads() {
  const { user } = useAuth();
  const [range, setRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [myUsers, setMyUsers] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [assigningLeadId, setAssigningLeadId] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

  const fetchLeads = async (r) => {
    setLoading(true);
    try {
      const res = await api.get('/leads/bd', { params: { range: r, limit: 200 } });
      setLeads(res.data?.items || []);
    } catch (e) {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyUsers = () => {
    if (!user) return;
    api.get('/bd/my-users').then((res) => setMyUsers(Array.isArray(res.data) ? res.data : [])).catch(() => setMyUsers([]));
  };

  useEffect(() => {
    fetchLeads(range);
  }, [range]);

  useEffect(() => {
    fetchMyUsers();
  }, [user]);

  const handleStatusChange = async (leadId, status) => {
    setUpdatingId(leadId);
    try {
      const res = await api.patch(`/leads/${leadId}/status`, { status });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? res.data : l)));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAssign = async () => {
    if (!assigningLeadId || !assignUserId) return;
    setAssignSaving(true);
    try {
      const res = await api.patch(`/leads/${assigningLeadId}/assign`, { assigned_user_id: assignUserId });
      setLeads((prev) => prev.map((l) => (l.id === assigningLeadId ? res.data : l)));
      setAssigningLeadId(null);
      setAssignUserId('');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to assign');
    } finally {
      setAssignSaving(false);
    }
  };

  return (
    <div className="bd-content">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: theme.text, marginBottom: 8 }}>Your leads</h1>
      <p style={{ color: theme.textMuted, fontSize: 15, marginBottom: 28 }}>Leads you created. Update status or open the job link.</p>

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <h2 className="bd-section-title" style={{ marginBottom: 0 }}><Briefcase size={20} /> Your leads</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Filter size={16} style={{ color: theme.textMuted }} />
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${theme.border}`, fontSize: 13, background: theme.cardBg }}
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p style={{ color: theme.textMuted }}>Loading leads…</p>
        ) : leads.length === 0 ? (
          <div style={{ background: theme.cardBg, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 28 }}>
            <p style={{ margin: 0, color: theme.textMuted }}>No leads in this range. Try a different filter or create a new lead from Create lead.</p>
          </div>
        ) : (
          <div style={{ borderRadius: 16, border: `1px solid ${theme.border}`, overflow: 'hidden', background: theme.cardBg, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <table className="bd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#1E293B' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Job</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Company</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Assigned user</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Job link</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const assignedUser = lead.assigned_user_id ? myUsers.find((u) => u.id === lead.assigned_user_id) : null;
                  return (
                    <tr key={lead.id}>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>{lead.job_title || '—'}</td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>{lead.company_name || '—'}</td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
                        {assignedUser ? (
                          assignedUser.full_name || assignedUser.email
                        ) : assigningLeadId === lead.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <select
                              value={assignUserId}
                              onChange={(e) => setAssignUserId(e.target.value)}
                              style={{ minWidth: 180, padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, fontSize: 13 }}
                            >
                              <option value="">Select user…</option>
                              {myUsers.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                              ))}
                            </select>
                            <button type="button" onClick={handleAssign} disabled={assignSaving || !assignUserId} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: theme.primary, color: '#fff', fontSize: 13, fontWeight: 600, cursor: assignSaving || !assignUserId ? 'default' : 'pointer', opacity: assignSaving || !assignUserId ? 0.7 : 1 }}>{assignSaving ? 'Saving…' : 'Save'}</button>
                            <button type="button" onClick={() => { setAssigningLeadId(null); setAssignUserId(''); }} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.cardBg, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                          </div>
                        ) : myUsers.length > 0 ? (
                          <button type="button" onClick={() => { setAssigningLeadId(lead.id); setAssignUserId(''); }} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${theme.primary}`, background: 'rgba(16,185,129,0.08)', color: theme.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Assign</button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
                        <select
                          value={lead.status || 'pending'}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          disabled={updatingId === lead.id}
                          style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, fontSize: 13, background: theme.cardBg }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
                        {lead.job_link ? (
                          <a href={lead.job_link} target="_blank" rel="noopener noreferrer" className="bd-link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${theme.primary}`, background: 'rgba(16,185,129,0.08)', color: theme.primary, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                            <ExternalLink size={14} /> Open
                          </a>
                        ) : (
                          <span style={{ color: theme.textMuted, fontSize: 13 }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
