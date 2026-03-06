import { useEffect, useState, useRef } from 'react';
import api from '../services/api.js';

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
    <div style={{ padding: 24 }}>
      <h2>Admin Dashboard</h2>
      {stats && (
        <div style={{ marginBottom: 24 }}>
          <p>Total users: {stats.totalUsers}</p>
          <p>Active subscribers: {stats.activeSubscribers}</p>
          <p>Monthly revenue: ${stats.monthlyRevenue}</p>
        </div>
      )}

      <h3>Plans</h3>
      <form onSubmit={createPlan} style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          name="name"
          placeholder="Plan name"
          value={newPlan.name}
          onChange={handleNewPlanChange}
        />
        <input
          name="price"
          type="number"
          placeholder="Price (USD)"
          value={newPlan.price}
          onChange={handleNewPlanChange}
        />
        <input
          name="stripePriceId"
          placeholder="Stripe Price ID"
          value={newPlan.stripePriceId}
          onChange={handleNewPlanChange}
          style={{ minWidth: 220 }}
        />
        <button type="submit">Add plan</button>
      </form>

      <ul style={{ marginBottom: 24 }}>
        {plans.map((p) => (
          <li key={p._id} style={{ marginBottom: 8 }}>
            <input
              defaultValue={p.name}
              onBlur={(e) => updatePlan(p._id, { ...p, name: e.target.value })}
              style={{ marginRight: 8 }}
            />
            <input
              type="number"
              defaultValue={p.price}
              onBlur={(e) => updatePlan(p._id, { ...p, price: Number(e.target.value) })}
              style={{ width: 80, marginRight: 8 }}
            />
            <input
              defaultValue={p.stripePriceId}
              onBlur={(e) => updatePlan(p._id, { ...p, stripePriceId: e.target.value })}
              style={{ minWidth: 220, marginRight: 8 }}
            />
            <span style={{ fontSize: 12, color: p.isActive ? 'green' : 'red' }}>
              {p.isActive ? 'Active' : 'Inactive'}
            </span>
          </li>
        ))}
      </ul>

      <h3>Users</h3>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
        New user signups appear here. Assign one or multiple BDs so only those BDs can assign leads to this user. BDs are loaded from BD signup (/bd/signup).
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
            <th style={{ textAlign: 'left', padding: 12 }}>Email</th>
            <th style={{ textAlign: 'left', padding: 12 }}>Assigned BDs</th>
            <th style={{ textAlign: 'left', padding: 12 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id || u._id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 12 }}>{u.name || u.full_name || '—'}</td>
              <td style={{ padding: 12 }}>{u.email}</td>
              <td style={{ padding: 12 }}>
                {(u.assigned_bds || []).length > 0 ? (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(u.assigned_bds || []).map((b) => (
                      <span key={b.id} style={assignedBdTag}>
                        {b.full_name || b.email}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span style={{ color: '#999' }}>—</span>
                )}
              </td>
              <td style={{ padding: 12, position: 'relative' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => openAssignModal(u)}
                    style={{ padding: '4px 10px' }}
                  >
                    {(u.assigned_bds || []).length ? 'Edit BDs' : 'Assign BD'}
                  </button>
                  <button type="button" onClick={() => toggleBlock(u)}>
                    {u.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>

                {assignModal && (assignModal.id === (u.id || u._id)) && (
                  <div style={inlineAssignPanel} onClick={(e) => e.stopPropagation()}>
                    <h4 style={{ marginTop: 0, marginBottom: 6 }}>Assign BD</h4>
                    <p style={{ marginBottom: 10, color: '#444', fontSize: 13 }}>
                      Only selected BDs can assign leads to this user.
                    </p>
                    <div ref={dropdownRef} style={{ position: 'relative', marginBottom: 10 }}>
                      <button
                        type="button"
                        style={dropdownTrigger}
                        onClick={() => setBdDropdownOpen((o) => !o)}
                        aria-expanded={bdDropdownOpen}
                        aria-haspopup="listbox"
                      >
                        <span>{getSelectedBdLabel()}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 12 }}>
                          {bdDropdownOpen ? '▲' : '▼'}
                        </span>
                      </button>
                      {bdDropdownOpen && (
                        <div style={dropdownPanel} role="listbox">
                          {bds.length === 0 ? (
                            <div style={{ padding: 12, color: '#888', fontSize: 13 }}>
                              No BDs yet. BDs sign up at <strong>/bd/signup</strong>.
                            </div>
                          ) : (
                            bds.map((bd) => (
                              <label
                                key={bd.id}
                                style={dropdownOption}
                                role="option"
                                aria-selected={selectedBdIds.includes(bd.id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBdIds.includes(bd.id)}
                                  onChange={() => toggleBdSelection(bd.id)}
                                  style={{ marginRight: 10 }}
                                />
                                <span>
                                  <strong>{bd.full_name || bd.email}</strong>
                                </span>
                                <span style={{ color: '#666', fontSize: 12 }}> {bd.email}</span>
                              </label>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => setAssignModal(null)}
                        disabled={assignSaving}
                        style={{ padding: '4px 10px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveAssignBd}
                        disabled={assignSaving}
                        style={{ padding: '4px 10px' }}
                      >
                        {assignSaving ? 'Saving…' : 'Save assignment'}
                      </button>
                    </div>

                    {assignError && (
                      <p style={{ color: '#c00', fontSize: 12, marginBottom: 8 }}>{assignError}</p>
                    )}

                    {selectedBdIds.length > 0 && (
                      <div
                        style={{
                          marginTop: 2,
                          marginBottom: 4,
                          flexWrap: 'wrap',
                          display: 'flex',
                          gap: 6,
                        }}
                      >
                        {bds
                          .filter((b) => selectedBdIds.includes(b.id))
                          .map((b) => (
                            <span key={b.id} style={selectedTag}>
                              {b.full_name || b.email}
                              <button
                                type="button"
                                aria-label={`Remove ${b.full_name || b.email}`}
                                style={selectedTagRemove}
                                onClick={() => toggleBdSelection(b.id)}
                              >
                                ×
                              </button>
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

      <h3>Subscriptions</h3>
      <ul>
        {subs.map((s) => (
          <li key={s._id}>
            {s.user?.email} – {s.plan?.name} – {s.status}{' '}
            <button onClick={() => cancelSub(s._id)}>Cancel</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const inlineAssignPanel = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: 6,
  background: 'white',
  padding: 12,
  borderRadius: 10,
  minWidth: 260,
  maxWidth: 340,
  boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
  border: '1px solid #e5e7eb',
  zIndex: 20,
};
const dropdownTrigger = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #ccc',
  borderRadius: 8,
  background: '#fff',
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
  border: '1px solid #ccc',
  borderRadius: 8,
  background: '#fff',
  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
  zIndex: 10,
};
const dropdownOption = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 12px',
  cursor: 'pointer',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 13,
};
const selectedTag = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  background: '#e8f4fd',
  borderRadius: 6,
  fontSize: 13,
};
const selectedTagRemove = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: '0 2px',
  color: '#666',
};
const assignedBdTag = {
  display: 'inline-block',
  padding: '2px 8px',
  background: '#e8f4fd',
  borderRadius: 6,
  fontSize: 12,
};

