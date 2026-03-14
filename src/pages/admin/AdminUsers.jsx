import React, { useEffect, useState, useRef } from 'react';
import { Users } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff' };

const inlineAssignPanel = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: 8,
  background: theme.cardBg,
  padding: 16,
  borderRadius: 12,
  minWidth: 280,
  maxWidth: 360,
  boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
  border: `1px solid ${theme.border}`,
  zIndex: 20,
};
const dropdownTrigger = {
  width: '100%',
  padding: '12px 14px',
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  background: theme.cardBg,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  fontSize: 14,
  textAlign: 'left',
};
const dropdownPanel = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 4,
  maxHeight: 220,
  overflowY: 'auto',
  border: `1px solid ${theme.border}`,
  borderRadius: 10,
  background: theme.cardBg,
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  zIndex: 10,
};
const dropdownOption = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
  cursor: 'pointer',
  borderBottom: `1px solid ${theme.border}`,
  fontSize: 13,
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [bds, setBds] = useState([]);
  const [plans, setPlans] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedBdIds, setSelectedBdIds] = useState([]);
  const [bdDropdownOpen, setBdDropdownOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [planUserModal, setPlanUserModal] = useState(null);
  const [planUserSaving, setPlanUserSaving] = useState(false);
  const [planUserValue, setPlanUserValue] = useState('');
  const dropdownRef = useRef(null);

  const fetchData = () => {
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/bds'),
      api.get('/admin/plans'),
    ]).then(([u, b, p]) => {
      setUsers(u.data || []);
      setBds(b.data || []);
      setPlans(p.data || []);
    }).catch(() => {});
  };

  useEffect(() => fetchData(), []);

  useEffect(() => {
    const close = (e) => {
      if (bdDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) setBdDropdownOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [bdDropdownOpen]);

  const openAssignModal = (user) => {
    setAssignModal(user);
    setSelectedBdIds((user.assigned_bds || []).map((b) => b.id));
    setBdDropdownOpen(false);
    setAssignError('');
  };

  const toggleBdSelection = (bdId) => {
    setSelectedBdIds((prev) => (prev.includes(bdId) ? prev.filter((id) => id !== bdId) : [...prev, bdId]));
  };

  const saveAssignBd = async () => {
    if (!assignModal) return;
    setAssignSaving(true);
    setAssignError('');
    try {
      await api.post('/admin/assign-bd', { user_id: assignModal.id, bd_ids: selectedBdIds });
      setAssignModal(null);
      setBdDropdownOpen(false);
      fetchData();
    } catch (e) {
      setAssignError(e.response?.data?.message || 'Failed to save. Try again.');
    } finally {
      setAssignSaving(false);
    }
  };

  const toggleBlock = async (u) => {
    const path = u.isBlocked ? 'unblock' : 'block';
    const res = await api.post(`/admin/users/${u.id || u._id}/${path}`);
    setUsers((list) => list.map((x) => (x.id === res.data.id || x._id === res.data._id ? res.data : x)));
  };

  const resetPassword = async (u) => {
    const label = u.name || u.full_name || u.email || 'this user';
    const pwd = window.prompt(`Enter new password for ${label}:`);
    if (!pwd) return;
    try {
      await api.post(`/admin/users/${u.id || u._id}/reset-password`, { password: pwd });
      alert('Password reset successfully.');
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to reset password');
    }
  };

  const setUserPlanSubmit = async () => {
    if (!planUserModal || !planUserValue) return;
    setPlanUserSaving(true);
    try {
      await api.put(`/admin/users/${planUserModal.id || planUserModal._id}/subscription-plan`, { plan_id: planUserValue });
      setPlanUserModal(null);
      setPlanUserValue('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set plan');
    } finally {
      setPlanUserSaving(false);
    }
  };

  const getSelectedBdLabel = () => {
    if (bds.length === 0) return 'No BDs registered yet';
    const selected = bds.filter((b) => selectedBdIds.includes(b.id));
    if (selected.length === 0) return 'Select BDs…';
    const names = selected.map((b) => b.full_name || b.email);
    if (names.length <= 2) return names.join(', ');
    return `${names[0]}, ${names[1]} + ${names.length - 2} more`;
  };

  return (
    <>
      <header className="admin-header">
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Users</h1>
        <span style={{ fontSize: 14, color: theme.textMuted }}>Assign BDs, set plan, block/unblock, reset password</span>
      </header>
      <div className="admin-content">
        <section className="admin-section">
          <h2 className="admin-section-title"><Users size={20} /> Users</h2>
          <p className="admin-helper">Assign BDs to users so only those BDs can assign leads. Set subscription plan, block/unblock, or reset password.</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Assigned BDs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id || u._id}>
                    <td>{u.name || u.full_name || '—'}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="admin-tag">{u.subscription_plan || 'free'}</span>
                      <button type="button" className="admin-btn-secondary" style={{ marginLeft: 8 }} onClick={() => { setPlanUserModal(u); setPlanUserValue(u.subscription_plan || 'free'); }}>Set plan</button>
                    </td>
                    <td>
                      {(u.assigned_bds || []).length > 0 ? (
                        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(u.assigned_bds || []).map((b) => (
                            <span key={b.id} className="admin-tag">{b.full_name || b.email}</span>
                          ))}
                        </span>
                      ) : (
                        <span style={{ color: theme.textMuted }}>—</span>
                      )}
                    </td>
                    <td style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="admin-btn-secondary" onClick={() => openAssignModal(u)}>
                          {(u.assigned_bds || []).length ? 'Edit BDs' : 'Assign BD'}
                        </button>
                        <button type="button" className="admin-btn-secondary" onClick={() => toggleBlock(u)}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                        <button type="button" className="admin-btn-secondary" onClick={() => resetPassword(u)}>Reset password</button>
                      </div>
                      {assignModal && assignModal.id === (u.id || u._id) && (
                        <div style={inlineAssignPanel} onClick={(e) => e.stopPropagation()}>
                          <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: theme.text }}>Assign BD</h4>
                          <p style={{ marginBottom: 10, color: theme.textMuted, fontSize: 13 }}>Only selected BDs can assign leads to this user.</p>
                          <div ref={dropdownRef} style={{ position: 'relative', marginBottom: 10 }}>
                            <button type="button" style={dropdownTrigger} onClick={() => setBdDropdownOpen((o) => !o)} aria-expanded={bdDropdownOpen} aria-haspopup="listbox">
                              <span>{getSelectedBdLabel()}</span>
                              <span style={{ marginLeft: 'auto', fontSize: 12 }}>{bdDropdownOpen ? '▲' : '▼'}</span>
                            </button>
                            {bdDropdownOpen && (
                              <div style={dropdownPanel} role="listbox">
                                {bds.length === 0 ? (
                                  <div style={{ padding: 12, color: theme.textMuted, fontSize: 13 }}>No BDs yet. BDs sign up at <strong>/bd/signup</strong>.</div>
                                ) : (
                                  bds.map((bd) => (
                                    <label key={bd.id} style={dropdownOption} role="option" aria-selected={selectedBdIds.includes(bd.id)}>
                                      <input type="checkbox" checked={selectedBdIds.includes(bd.id)} onChange={() => toggleBdSelection(bd.id)} style={{ marginRight: 10 }} />
                                      <span><strong>{bd.full_name || bd.email}</strong></span>
                                      <span style={{ color: theme.textMuted, fontSize: 12 }}> {bd.email}</span>
                                    </label>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                            <button type="button" className="admin-btn-secondary" onClick={() => setAssignModal(null)} disabled={assignSaving}>Cancel</button>
                            <button type="button" className="admin-btn-primary" onClick={saveAssignBd} disabled={assignSaving}>{assignSaving ? 'Saving…' : 'Save'}</button>
                          </div>
                          {assignError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{assignError}</p>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {planUserModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setPlanUserModal(null)}>
            <div className="admin-card" style={{ minWidth: 360, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: theme.text }}>Set subscription plan</h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: theme.textMuted }}>{planUserModal.email} — choose a plan_id</p>
              <select value={planUserValue} onChange={(e) => setPlanUserValue(e.target.value)} className="admin-select" style={{ width: '100%', marginBottom: 16 }}>
                <option value="free">free</option>
                {(plans || []).filter((pl) => pl.isActive !== false).map((pl) => (
                  <option key={pl.plan_id} value={pl.plan_id}>{pl.name} ({pl.plan_id})</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="admin-btn-secondary" onClick={() => setPlanUserModal(null)}>Cancel</button>
                <button type="button" className="admin-btn-primary" onClick={setUserPlanSubmit} disabled={planUserSaving}>{planUserSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
