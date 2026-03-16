import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Users, CreditCard, DollarSign, Shield, LayoutDashboard, Briefcase, LogOut, Lock, ExternalLink } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import './AdminDashboard.css';

const theme = {
  primary: '#10B981',
  blue: '#2563EB',
  violet: '#7C3AED',
  slate: '#0F172A',
  slateLight: '#1E293B',
  bg: '#F1F5F9',
  cardBg: '#ffffff',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bds, setBds] = useState([]);
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [leads, setLeads] = useState({ items: [], total: 0 });
  const [leadStats, setLeadStats] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedBdIds, setSelectedBdIds] = useState([]);
  const [bdDropdownOpen, setBdDropdownOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [planUserModal, setPlanUserModal] = useState(null);
  const [planUserSaving, setPlanUserSaving] = useState(false);
  const [planUserValue, setPlanUserValue] = useState('');
  const dropdownRef = useRef(null);
  const [newPlan, setNewPlan] = useState({
    plan_id: '',
    name: '',
    price: '',
    currency: 'USD',
    billing_interval: 'monthly',
    description: '',
  });

  const fetchData = () => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/admin/bds'),
      api.get('/admin/subscriptions'),
      api.get('/admin/plans'),
      api.get('/leads/filter', { params: { range: 'all', limit: 200 } }).catch(() => ({ data: { items: [], total: 0 } })),
      api.get('/leads/stats').catch(() => ({ data: null })),
    ]).then(([s, u, b, sub, p, leadsRes, statsRes]) => {
      setStats(s.data);
      setUsers(u.data);
      setBds(b.data || []);
      setSubs(sub.data || []);
      setPlans(p.data || []);
      setLeads(leadsRes.data || { items: [], total: 0 });
      setLeadStats(statsRes.data || null);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (bdDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setBdDropdownOpen(false);
      }
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [bdDropdownOpen]);

  const openAssignModal = (user) => {
    const currentIds = (user.assigned_bds || []).map((b) => b.id);
    setAssignModal(user);
    setSelectedBdIds(currentIds);
    setBdDropdownOpen(false);
    setAssignError('');
  };

  const toggleBdSelection = (bdId) => {
    setSelectedBdIds((prev) =>
      prev.includes(bdId) ? prev.filter((id) => id !== bdId) : [...prev, bdId]
    );
  };

  const saveAssignBd = async () => {
    if (!assignModal) return;
    setAssignSaving(true);
    setAssignError('');
    try {
      await api.post('/admin/assign-bd', {
        user_id: assignModal.id,
        bd_ids: selectedBdIds,
      });
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

  const cancelSub = async (id) => {
    const res = await api.post(`/admin/subscriptions/${id}/cancel`);
    setSubs((list) => list.map((x) => ((x.id || x._id) === (res.data?.id ?? res.data?._id) ? { ...x, ...res.data } : x)));
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

  const handleNewPlanChange = (e) => {
    const { name, value } = e.target;
    setNewPlan((prev) => ({ ...prev, [name]: value }));
  };

  const createPlan = async (e) => {
    e.preventDefault();
    if (!newPlan.plan_id || !newPlan.name || newPlan.price === '' || newPlan.price == null) return;
    try {
      const res = await api.post('/admin/plans', {
        plan_id: newPlan.plan_id.trim().toLowerCase().replace(/\s+/g, '_'),
        name: newPlan.name.trim(),
        price: Number(newPlan.price),
        currency: (newPlan.currency || 'USD').trim(),
        billing_interval: (newPlan.billing_interval || 'monthly').trim(),
        description: newPlan.description?.trim() || null,
      });
      setPlans((list) => [...list, res.data]);
      setNewPlan({ plan_id: '', name: '', price: '', currency: 'USD', billing_interval: 'monthly', description: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create plan');
    }
  };

  const updatePlan = async (id, updates) => {
    try {
      const res = await api.put(`/admin/plans/${id}`, updates);
      setPlans((list) => list.map((p) => (p.id === res.data.id || p._id === res.data._id ? res.data : p)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update plan');
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
    const [first, second, ...rest] = names;
    return `${first}, ${second} + ${rest.length} more`;
  };

  const planIdForUpdate = (p) => p.id || p._id;

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-sidebar__logo">
          <img src="/logo.png" alt="HiredLogics" />
          <span className="admin-sidebar__logo-text">HiredLogics</span>
        </Link>
        <div className="admin-sidebar__sub">Admin Portal</div>
        {user && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginBottom: 24 }}>
            Logged in as <strong>{user.email}</strong>
          </div>
        )}
        <nav className="admin-sidebar__nav">
          <span className="admin-sidebar__nav-item active">
            <LayoutDashboard size={18} />
            Dashboard
          </span>
        </nav>
        <div className="admin-sidebar__footer">
          <button
            type="button"
            className="admin-sidebar__btn"
            onClick={async () => {
              const current = window.prompt('Enter your current password:');
              if (!current) return;
              const newPwd = window.prompt('Enter new password (min 6 chars):');
              if (!newPwd) return;
              try {
                await api.put('/settings/password', { current_password: current, new_password: newPwd });
                alert('Password updated.');
              } catch (e) {
                alert(e.response?.data?.message || 'Failed');
              }
            }}
          >
            <Lock size={18} />
            Change password
          </button>
          <button type="button" className="admin-sidebar__btn" onClick={logout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Admin Dashboard</h1>
          <span style={{ fontSize: 14, color: theme.textMuted }}>Manage users, BDs, plans, leads & subscriptions</span>
        </header>

        <div className="admin-content">
          {stats && (
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 36 }}>
              <div className="admin-stat-card">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.primary}20`, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{stats.totalUsers ?? 0}</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Total users</div>
                </div>
              </div>
              <div className="admin-stat-card">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.primary}20`, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{stats.activeSubscribers ?? 0}</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Active subscribers</div>
                </div>
              </div>
              <div className="admin-stat-card">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.blue}20`, color: theme.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>${Number(stats.monthlyRevenue ?? 0).toFixed(2)}</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Monthly revenue</div>
                </div>
              </div>
            </section>
          )}

          <section className="admin-section">
            <h2 className="admin-section-title">
              <BarChart3 size={20} />
              Plans
            </h2>
            <p className="admin-helper">Add and edit subscription plans. plan_id is a unique slug (e.g. starter, elite).</p>
            <form onSubmit={createPlan} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              <input
                name="plan_id"
                placeholder="plan_id (slug)"
                value={newPlan.plan_id}
                onChange={handleNewPlanChange}
                className="admin-input"
                style={{ minWidth: 140 }}
              />
              <input
                name="name"
                placeholder="Display name"
                value={newPlan.name}
                onChange={handleNewPlanChange}
                className="admin-input"
                style={{ minWidth: 160 }}
              />
              <input
                name="price"
                type="number"
                step="0.01"
                placeholder="Price"
                value={newPlan.price}
                onChange={handleNewPlanChange}
                className="admin-input"
                style={{ width: 90 }}
              />
              <select
                name="currency"
                value={newPlan.currency}
                onChange={handleNewPlanChange}
                className="admin-select"
                style={{ width: 80 }}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
              <select
                name="billing_interval"
                value={newPlan.billing_interval}
                onChange={handleNewPlanChange}
                className="admin-select"
                style={{ width: 110 }}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input
                name="description"
                placeholder="Description (optional)"
                value={newPlan.description}
                onChange={handleNewPlanChange}
                className="admin-input"
                style={{ minWidth: 200 }}
              />
              <button type="submit" className="admin-btn-primary">Add plan</button>
            </form>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>plan_id</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Interval</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.length === 0 ? (
                    <tr><td colSpan={7} className="admin-empty">No plans yet. Add one above.</td></tr>
                  ) : (
                    plans.map((p) => (
                      <tr key={planIdForUpdate(p)}>
                        <td><code style={{ fontSize: 12 }}>{p.plan_id}</code></td>
                        <td>
                          <input
                            defaultValue={p.name}
                            onBlur={(e) => updatePlan(planIdForUpdate(p), { name: e.target.value })}
                            className="admin-input"
                            style={{ width: '100%', maxWidth: 160 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={p.price}
                            onBlur={(e) => updatePlan(planIdForUpdate(p), { price: Number(e.target.value) })}
                            className="admin-input"
                            style={{ width: 80 }}
                          />
                        </td>
                        <td>{p.billing_interval || 'monthly'}</td>
                        <td>
                          <input
                            defaultValue={p.description}
                            onBlur={(e) => updatePlan(planIdForUpdate(p), { description: e.target.value })}
                            className="admin-input"
                            style={{ width: '100%', maxWidth: 200 }}
                            placeholder="Optional"
                          />
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: p.isActive ? theme.primary : theme.textMuted }}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            onClick={() => updatePlan(planIdForUpdate(p), { is_active: !p.isActive })}
                          >
                            {p.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">
              <Users size={20} />
              Users
            </h2>
            <p className="admin-helper">
              Assign BDs to users, set subscription plan, block/unblock, or reset password.
            </p>
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
                        <button
                          type="button"
                          className="admin-btn-secondary"
                          style={{ marginLeft: 8 }}
                          onClick={() => {
                            setPlanUserModal(u);
                            setPlanUserValue(u.subscription_plan || 'free');
                          }}
                        >
                          Set plan
                        </button>
                      </td>
                      <td>
                        {(u.assigned_bds || []).length > 0 ? (
                          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(u.assigned_bds || []).map((b) => (
                              <span key={b.id} className="admin-tag">
                                {b.full_name || b.email}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span style={{ color: theme.textMuted }}>—</span>
                        )}
                      </td>
                      <td style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="admin-btn-secondary"
                            onClick={() => openAssignModal(u)}
                          >
                            {(u.assigned_bds || []).length ? 'Edit BDs' : 'Assign BD'}
                          </button>
                          <button type="button" className="admin-btn-secondary" onClick={() => toggleBlock(u)}>
                            {u.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                          <button type="button" className="admin-btn-secondary" onClick={() => resetPassword(u)}>
                            Reset password
                          </button>
                        </div>

                        {assignModal && (assignModal.id === (u.id || u._id)) && (
                          <div style={inlineAssignPanel} onClick={(e) => e.stopPropagation()}>
                            <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: theme.text }}>Assign BD</h4>
                            <p style={{ marginBottom: 10, color: theme.textMuted, fontSize: 13 }}>Only selected BDs can assign leads to this user.</p>
                            <div ref={dropdownRef} style={{ position: 'relative', marginBottom: 10 }}>
                              <button
                                type="button"
                                style={dropdownTrigger}
                                onClick={() => setBdDropdownOpen((o) => !o)}
                                aria-expanded={bdDropdownOpen}
                                aria-haspopup="listbox"
                              >
                                <span>{getSelectedBdLabel()}</span>
                                <span style={{ marginLeft: 'auto', fontSize: 12 }}>{bdDropdownOpen ? '▲' : '▼'}</span>
                              </button>
                              {bdDropdownOpen && (
                                <div style={dropdownPanel} role="listbox">
                                  {bds.length === 0 ? (
                                    <div style={{ padding: 12, color: theme.textMuted, fontSize: 13 }}>
                                      No BDs yet. BDs sign up at <strong>/bd/signup</strong>.
                                    </div>
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
                              <button type="button" className="admin-btn-primary" onClick={saveAssignBd} disabled={assignSaving}>
                                {assignSaving ? 'Saving…' : 'Save'}
                              </button>
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
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
              onClick={() => setPlanUserModal(null)}
            >
              <div className="admin-card" style={{ minWidth: 360, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 8px', fontSize: 18, color: theme.text }}>Set subscription plan</h3>
                <p style={{ margin: '0 0 16px', fontSize: 14, color: theme.textMuted }}>
                  {planUserModal.email} — choose a plan_id
                </p>
                <select
                  value={planUserValue}
                  onChange={(e) => setPlanUserValue(e.target.value)}
                  className="admin-select"
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  <option value="free">free</option>
                  {plans.filter((pl) => pl.isActive !== false).map((pl) => (
                    <option key={pl.plan_id} value={pl.plan_id}>{pl.name} ({pl.plan_id})</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="admin-btn-secondary" onClick={() => setPlanUserModal(null)}>Cancel</button>
                  <button type="button" className="admin-btn-primary" onClick={setUserPlanSubmit} disabled={planUserSaving}>
                    {planUserSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="admin-section">
            <h2 className="admin-section-title">
              <Briefcase size={20} />
              Leads (all)
            </h2>
            <p className="admin-helper">All job assignments across BDs. Stats from the system.</p>
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
                    <th>Status</th>
                    <th>Created</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {(leads.items || []).length === 0 ? (
                    <tr><td colSpan={5} className="admin-empty">No leads.</td></tr>
                  ) : (
                    (leads.items || []).slice(0, 50).map((lead) => (
                      <tr key={lead.id}>
                        <td>{lead.job_title || '—'}</td>
                        <td>{lead.company_name || '—'}</td>
                        <td><span className="admin-tag">{lead.status || 'pending'}</span></td>
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
            {(leads.items || []).length > 50 && (
              <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 8 }}>Showing first 50 of {leads.total}.</p>
            )}
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">
              <Shield size={20} />
              BDs
            </h2>
            <p className="admin-helper">BD accounts from the BD Portal. Reset passwords here.</p>
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
                        <button type="button" className="admin-btn-secondary" onClick={() => resetPassword(bd)}>
                          Reset password
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bds.length === 0 && (
                    <tr><td colSpan={3} className="admin-empty">No BD accounts yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Subscriptions</h2>
            <p className="admin-helper">Active and canceled subscriptions. Cancel moves status to canceled.</p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Period end</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.length === 0 ? (
                    <tr><td colSpan={5} className="admin-empty">No subscriptions.</td></tr>
                  ) : (
                    subs.map((s) => (
                      <tr key={s.id || s._id}>
                        <td>{s.user_email || s.user_name || '—'}</td>
                        <td><span className="admin-tag">{s.plan_name || s.plan_id}</span></td>
                        <td>{s.status}</td>
                        <td>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}</td>
                        <td>
                          {s.status === 'active' && (
                            <button type="button" className="admin-btn-secondary" onClick={() => cancelSub(s.id || s._id)}>
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

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
const selectedTagRemove = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: '0 2px',
  color: theme.textMuted,
};

