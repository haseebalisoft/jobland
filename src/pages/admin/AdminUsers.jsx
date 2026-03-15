import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [bds, setBds] = useState([]);
  const [plans, setPlans] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedBdIds, setSelectedBdIds] = useState([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [planUserModal, setPlanUserModal] = useState(null);
  const [planUserSaving, setPlanUserSaving] = useState(false);
  const [planUserValue, setPlanUserValue] = useState('');
  const [resetPasswordModal, setResetPasswordModal] = useState(null);
  const [resetPasswordNew, setResetPasswordNew] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

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

  const openAssignModal = (user) => {
    setAssignModal(user);
    setSelectedBdIds((user.assigned_bds || []).map((b) => b.id).filter(Boolean));
    setAssignError('');
  };

  const toggleBdSelection = (bdId) => {
    setSelectedBdIds((prev) => (prev.includes(bdId) ? prev.filter((id) => id !== bdId) : [...prev, bdId]));
  };

  const saveAssignBd = async () => {
    if (!assignModal) return;
    const userId = assignModal.id || assignModal._id;
    if (!userId) {
      setAssignError('User ID missing. Try again.');
      return;
    }
    setAssignSaving(true);
    setAssignError('');
    try {
      await api.post('/admin/assign-bd', { user_id: userId, bd_ids: selectedBdIds || [] });
      setAssignModal(null);
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

  const openResetPasswordModal = (u) => {
    setResetPasswordModal(u);
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
      await api.post(`/admin/users/${resetPasswordModal.id || resetPasswordModal._id}/reset-password`, { password: resetPasswordNew });
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

  const isBdSelected = (bdId) => selectedBdIds.includes(bdId);

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
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="admin-btn-secondary" onClick={() => openAssignModal(u)}>
                          {(u.assigned_bds || []).length ? 'Edit BDs' : 'Assign BD'}
                        </button>
                        <button type="button" className="admin-btn-secondary" onClick={() => toggleBlock(u)}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                        <button type="button" className="admin-btn-secondary" onClick={() => openResetPasswordModal(u)}>Reset / Change password</button>
                      </div>
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

        {resetPasswordModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setResetPasswordModal(null)}>
            <div className="admin-card" style={{ minWidth: 360, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: theme.text }}>Reset / Change password</h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: theme.textMuted }}>{resetPasswordModal.name || resetPasswordModal.full_name || resetPasswordModal.email}</p>
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

        {assignModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setAssignModal(null); setAssignError(''); }}>
            <div className="admin-card" style={{ minWidth: 360, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, color: theme.text }}>Assign BDs to user</h3>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: theme.textMuted }}>{assignModal.name || assignModal.full_name || assignModal.email}</p>
              <p style={{ marginBottom: 12, color: theme.textMuted, fontSize: 13 }}>Select which BDs can assign leads to this user. They will see this user in the BD portal.</p>
              {bds.length === 0 ? (
                <p style={{ padding: 12, color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>No BDs yet. BDs sign up at <strong>/bd/signup</strong>.</p>
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16, border: `1px solid ${theme.border}`, borderRadius: 10 }}>
                  {bds.map((bd) => (
                    <label key={bd.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, fontSize: 13 }}>
                      <input type="checkbox" checked={isBdSelected(bd.id)} onChange={() => toggleBdSelection(bd.id)} style={{ marginRight: 10 }} />
                      <span><strong>{bd.full_name || bd.email}</strong></span>
                      <span style={{ color: theme.textMuted, fontSize: 12, marginLeft: 6 }}>{bd.email}</span>
                    </label>
                  ))}
                </div>
              )}
              {assignError && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 12px' }}>{assignError}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="admin-btn-secondary" onClick={() => { setAssignModal(null); setAssignError(''); }} disabled={assignSaving}>Cancel</button>
                <button type="button" className="admin-btn-primary" onClick={saveAssignBd} disabled={assignSaving}>{assignSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
