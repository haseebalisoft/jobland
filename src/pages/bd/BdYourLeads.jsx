import React, { useEffect, useState } from 'react';
import { Briefcase, Filter, ExternalLink } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import '../BdDashboard.css';

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 days' },
  { value: '7days', label: 'Last 7 days' },
  { value: '15days', label: 'Last 15 days' },
  { value: 'all', label: 'All time' },
];
const STATUS_OPTIONS = ['pending', 'assigned', 'completed', 'failed'];
const APPLICATION_STATUS_OPTIONS = ['applied', 'interview', 'acceptance', 'rejection', 'withdrawn'];

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff' };

export default function BdYourLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [myUsers, setMyUsers] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [updatingAppId, setUpdatingAppId] = useState(null);
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

  const handleApplicationStatusChange = async (lead, status) => {
    if (!lead.application_id) {
      alert('No application exists yet for this lead. Once the user has an application for this job, you can set its status here.');
      return;
    }
    setUpdatingAppId(lead.application_id);
    try {
      await api.patch(`/applications/${lead.application_id}/status`, { status });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, application_status: status } : l,
        ),
      );

      if (status === 'interview') {
        navigate(`/bd/interview?applicationId=${lead.application_id}`);
      }
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to update application status');
    } finally {
      setUpdatingAppId(null);
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

  const handleOpenResume = async (applicationId) => {
    if (!applicationId) return;
    try {
      const res = await api.get(`/applications/${applicationId}/resume`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to open resume');
    }
  };

  const handleUseSavedResume = async (lead) => {
    if (!lead?.application_id || !lead?.assigned_user_id) {
      alert('Assign a user and ensure application exists first.');
      return;
    }
    try {
      let listRes;
      try {
        listRes = await api.get(`/cv/saved/user/${lead.assigned_user_id}`);
      } catch (err) {
        if (err?.response?.status === 404) {
          listRes = await api.get(`/cv/saved-resumes/user/${lead.assigned_user_id}`);
        } else {
          throw err;
        }
      }
      const items = Array.isArray(listRes.data) ? listRes.data : [];
      if (items.length === 0) {
        alert('No saved resumes found for this user.');
        return;
      }
      const options = items.map((item, idx) => `${idx + 1}. ${item.title} (${new Date(item.created_at).toLocaleDateString()})`).join('\n');
      const chosen = window.prompt(`Select saved resume number:\n${options}`, '1');
      const i = Number(chosen) - 1;
      if (!Number.isInteger(i) || i < 0 || i >= items.length) return;
      const picked = items[i];

      try {
        await api.post(`/applications/${lead.application_id}/attach-saved-resume`, { saved_resume_id: picked.id });
      } catch (err) {
        if (err?.response?.status === 404) {
          await api.post(`/applications/${lead.application_id}/use-saved-resume`, { saved_resume_id: picked.id });
        } else {
          throw err;
        }
      }
      await fetchLeads(range);
      alert('Saved resume attached to application.');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to attach saved resume');
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
            <div className="bd-table-wrap">
            <table className="bd-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#1E293B' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Job</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Company</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Assigned user</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Created</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Lead status</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Application status</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>Resume</th>
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
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}`, fontSize: 13, color: theme.text }}>
                        {lead.status || 'pending'}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
                        <select
                          value={lead.application_status || 'applied'}
                          onChange={(e) => handleApplicationStatusChange(lead, e.target.value)}
                          disabled={updatingAppId === lead.application_id || !lead.assigned_user_id}
                          style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${theme.border}`, fontSize: 13, background: theme.cardBg }}
                        >
                          {APPLICATION_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}` }}>
                        {lead.assigned_user_id && lead.application_id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => handleUseSavedResume(lead)}
                                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${theme.primary}`, background: 'rgba(16,185,129,0.08)', color: theme.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Use user saved
                              </button>
                              {lead.has_resume && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenResume(lead.application_id)}
                                  style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.cardBg, color: theme.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                >
                                  View used
                                </button>
                              )}
                            </div>
                            {lead.has_resume ? (
                              <span style={{ fontSize: 12, color: theme.textMuted }}>
                                Source: {lead.resume_source === 'bd_provided' ? 'BD provided' : 'User provided'}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: theme.textMuted }}>No resume attached yet.</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: theme.textMuted, fontSize: 12 }}>Assign user first.</span>
                        )}
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
          </div>
        )}
      </section>
    </div>
  );
}
