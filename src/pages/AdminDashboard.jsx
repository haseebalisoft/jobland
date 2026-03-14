import { useEffect, useState, useRef } from 'react';
import { BarChart3, Users, CreditCard, DollarSign, Shield } from 'lucide-react';
import api from '../services/api.js';

const theme = {
  primary: '#0d9488',
  primaryDark: '#0f766e',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  slate: '#0f172a',
  slateLight: '#1e293b',
  bg: '#f0fdfa',
  cardBg: '#ffffff',
  border: '#ccfbf1',
  text: '#0f172a',
  textMuted: '#64748b',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bds, setBds] = useState([]);
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedBdIds, setSelectedBdIds] = useState([]);
  const [bdDropdownOpen, setBdDropdownOpen] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const dropdownRef = useRef(null);
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    stripePriceId: '',
  });

  const fetchData = () => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/admin/bds'),
      api.get('/admin/subscriptions'),
      api.get('/admin/plans'),
    ]).then(([s, u, b, sub, p]) => {
      setStats(s.data);
      setUsers(u.data);
      setBds(b.data || []);
      setSubs(sub.data);
      setPlans(p.data);
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
    setSubs((list) => list.map((x) => (x._id === res.data._id ? res.data : x)));
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
    if (!newPlan.name || !newPlan.price || !newPlan.stripePriceId) return;
    const res = await api.post('/admin/plans', {
      name: newPlan.name,
      price: Number(newPlan.price),
      stripePriceId: newPlan.stripePriceId,
    });
    setPlans((list) => [...list, res.data]);
    setNewPlan({ name: '', price: '', stripePriceId: '' });
  };

  const updatePlan = async (id, updates) => {
    const res = await api.put(`/admin/plans/${id}`, updates);
    setPlans((list) => list.map((p) => (p._id === res.data._id ? res.data : p)));
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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoIcon}></div>
          <div>
            <h1 style={styles.title}>HiredLogics Admin</h1>
            <p style={styles.subtitle}>Manage users, BDs, plans & subscriptions</p>
          </div>
        </div>
      </header>

      {stats && (
        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${theme.primary}20`, color: theme.primary }}>
              <Users size={22} />
            </div>
            <div>
              <div style={styles.statValue}>{stats.totalUsers ?? 0}</div>
              <div style={styles.statLabel}>Total users</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${theme.teal}20`, color: theme.teal }}>
              <CreditCard size={22} />
            </div>
            <div>
              <div style={styles.statValue}>{stats.activeSubscribers ?? 0}</div>
              <div style={styles.statLabel}>Active subscribers</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${theme.cyan}20`, color: theme.cyan }}>
              <DollarSign size={22} />
            </div>
            <div>
              <div style={styles.statValue}>${stats.monthlyRevenue ?? 0}</div>
              <div style={styles.statLabel}>Monthly revenue</div>
            </div>
          </div>
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <BarChart3 size={20} style={{ marginRight: 8 }} />
          Plans
        </h2>
        <form onSubmit={createPlan} style={styles.planForm}>
          <input
            name="name"
            placeholder="Plan name"
            value={newPlan.name}
            onChange={handleNewPlanChange}
            style={styles.input}
          />
          <input
            name="price"
            type="number"
            placeholder="Price (USD)"
            value={newPlan.price}
            onChange={handleNewPlanChange}
            style={styles.input}
          />
          <input
            name="stripePriceId"
            placeholder="Stripe Price ID"
            value={newPlan.stripePriceId}
            onChange={handleNewPlanChange}
            style={{ ...styles.input, minWidth: 220 }}
          />
          <button type="submit" style={styles.primaryBtn}>Add plan</button>
        </form>
        <div style={styles.planList}>
          {plans.map((p) => (
            <div key={p._id} style={styles.planRow}>
              <input
                defaultValue={p.name}
                onBlur={(e) => updatePlan(p._id, { ...p, name: e.target.value })}
                style={styles.input}
              />
              <input
                type="number"
                defaultValue={p.price}
                onBlur={(e) => updatePlan(p._id, { ...p, price: Number(e.target.value) })}
                style={{ ...styles.input, width: 90 }}
              />
              <input
                defaultValue={p.stripePriceId}
                onBlur={(e) => updatePlan(p._id, { ...p, stripePriceId: e.target.value })}
                style={{ ...styles.input, minWidth: 220 }}
              />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: p.isActive ? theme.teal : theme.textMuted,
              }}>
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <Users size={20} style={{ marginRight: 8 }} />
          Users
        </h2>
        <p style={styles.helperText}>
          Assign one or multiple BDs to users so only those BDs can assign leads. BDs sign up at /bd/signup.
        </p>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Assigned BDs</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id || u._id} style={styles.tr}>
                  <td style={styles.td}>{u.name || u.full_name || '—'}</td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>
                    {(u.assigned_bds || []).length > 0 ? (
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(u.assigned_bds || []).map((b) => (
                          <span key={b.id} style={assignedBdTag}>
                            {b.full_name || b.email}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span style={{ color: theme.textMuted }}>—</span>
                    )}
                  </td>
                  <td style={{ ...styles.td, position: 'relative' }}>
                    <div style={styles.actionBtns}>
                      <button
                        type="button"
                        onClick={() => openAssignModal(u)}
                        style={styles.btnSecondary}
                      >
                        {(u.assigned_bds || []).length ? 'Edit BDs' : 'Assign BD'}
                      </button>
                      <button type="button" onClick={() => toggleBlock(u)} style={styles.btnSecondary}>
                        {u.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                      <button type="button" onClick={() => resetPassword(u)} style={styles.btnSecondary}>
                        Reset password
                      </button>
                    </div>

                {assignModal && (assignModal.id === (u.id || u._id)) && (
                  <div style={inlineAssignPanel} onClick={(e) => e.stopPropagation()}>
                    <h4 style={styles.modalTitle}>Assign BD</h4>
                    <p style={styles.modalText}>Only selected BDs can assign leads to this user.</p>
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
                      <button type="button" onClick={() => setAssignModal(null)} disabled={assignSaving} style={styles.btnSecondary}>
                        Cancel
                      </button>
                      <button type="button" onClick={saveAssignBd} disabled={assignSaving} style={styles.primaryBtn}>
                        {assignSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                    {assignError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{assignError}</p>}
                    {selectedBdIds.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {bds.filter((b) => selectedBdIds.includes(b.id)).map((b) => (
                          <span key={b.id} style={selectedTag}>
                            {b.full_name || b.email}
                            <button type="button" aria-label={`Remove ${b.full_name || b.email}`} style={selectedTagRemove} onClick={() => toggleBdSelection(b.id)}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          <Shield size={20} style={{ marginRight: 8 }} />
          BDs
        </h2>
        <p style={styles.helperText}>BD accounts from the BD Portal. Reset passwords here.</p>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bds.map((bd) => (
                <tr key={bd.id} style={styles.tr}>
                  <td style={styles.td}>{bd.full_name || bd.name || '—'}</td>
                  <td style={styles.td}>{bd.email}</td>
                  <td style={styles.td}>
                    <button type="button" onClick={() => resetPassword(bd)} style={styles.btnSecondary}>
                      Reset password
                    </button>
                  </td>
                </tr>
              ))}
              {bds.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ ...styles.td, color: theme.textMuted }}>No BD accounts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Subscriptions</h2>
        <div style={styles.subList}>
          {subs.length === 0 ? (
            <p style={{ color: theme.textMuted, margin: 0 }}>No subscriptions.</p>
          ) : (
            subs.map((s) => (
              <div key={s._id} style={styles.subRow}>
                <span>{s.user?.email}</span>
                <span style={{ color: theme.textMuted }}> – {s.plan?.name} – {s.status}</span>
                <button type="button" onClick={() => cancelSub(s._id)} style={styles.btnSecondary}>Cancel</button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: theme.bg,
    padding: '24px 32px 48px',
    fontFamily: 'var(--font-primary)',
  },
  header: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottom: `1px solid ${theme.border}`,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.teal} 100%)`,
    boxShadow: `0 4px 14px ${theme.primary}40`,
  },
  title: { fontSize: 28, fontWeight: 800, color: theme.text, margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: theme.textMuted, margin: '4px 0 0' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 20,
    marginBottom: 32,
  },
  statCard: {
    background: theme.cardBg,
    padding: 20,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  statIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: 800, color: theme.text },
  statLabel: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  section: { marginBottom: 32 },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    marginBottom: 12,
  },
  helperText: { color: theme.textMuted, fontSize: 14, marginBottom: 16 },
  tableWrap: {
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    overflow: 'hidden',
    background: theme.cardBg,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  tableHeaderRow: {
    background: `linear-gradient(90deg, ${theme.slate} 0%, ${theme.slateLight} 100%)`,
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: '0.03em',
  },
  tr: { borderBottom: `1px solid ${theme.border}` },
  td: { padding: '14px 16px' },
  input: {
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    fontSize: 14,
    background: theme.cardBg,
  },
  primaryBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.teal} 100%)`,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: `0 4px 14px ${theme.primary}40`,
  },
  btnSecondary: {
    padding: '8px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    color: theme.text,
  },
  actionBtns: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  planForm: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  planList: { display: 'flex', flexDirection: 'column', gap: 10 },
  planRow: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  modalTitle: { marginTop: 0, marginBottom: 6, fontSize: 16, fontWeight: 600, color: theme.text },
  modalText: { marginBottom: 10, color: theme.textMuted, fontSize: 13 },
  subList: { display: 'flex', flexDirection: 'column', gap: 8 },
  subRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: theme.cardBg,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
  },
};

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
const selectedTag = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  background: `${theme.teal}20`,
  borderRadius: 8,
  fontSize: 13,
  color: theme.primary,
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
const assignedBdTag = {
  display: 'inline-block',
  padding: '4px 10px',
  background: `${theme.teal}20`,
  borderRadius: 8,
  fontSize: 12,
  color: theme.primary,
  fontWeight: 500,
};

