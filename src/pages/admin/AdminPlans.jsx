import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff' };

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({ plan_id: '', name: '', price: '', currency: 'USD', billing_interval: 'per_interview', description: '' });

  const fetchPlans = () => {
    api.get('/admin/plans').then((res) => setPlans(res.data || [])).catch(() => setPlans([]));
  };

  useEffect(() => fetchPlans(), []);

  const handleNewPlanChange = (e) => {
    const { name, value } = e.target;
    setNewPlan((prev) => ({ ...prev, [name]: value }));
  };

  const createPlan = async (e) => {
    e.preventDefault();
    if (!newPlan.plan_id || !newPlan.name || newPlan.price === '' || newPlan.price == null) return;
    try {
      await api.post('/admin/plans', {
        plan_id: newPlan.plan_id.trim().toLowerCase().replace(/\s+/g, '_'),
        name: newPlan.name.trim(),
        price: Number(newPlan.price),
        currency: (newPlan.currency || 'USD').trim(),
        billing_interval: (newPlan.billing_interval || 'per_interview').trim(),
        description: newPlan.description?.trim() || null,
      });
      setNewPlan({ plan_id: '', name: '', price: '', currency: 'USD', billing_interval: 'per_interview', description: '' });
      fetchPlans();
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

  const planIdForUpdate = (p) => p.id || p._id;

  return (
    <>
      <header className="admin-header">
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Plans</h1>
        <span style={{ fontSize: 14, color: theme.textMuted }}>Add and edit subscription plans</span>
      </header>
      <div className="admin-content">
        <section className="admin-section">
          <h2 className="admin-section-title"><BarChart3 size={20} /> Plans</h2>
          <p className="admin-helper">plan_id is a unique slug (e.g. starter, elite).</p>
          <form onSubmit={createPlan} className="admin-form-inline">
            <input name="plan_id" placeholder="plan_id (slug)" value={newPlan.plan_id} onChange={handleNewPlanChange} className="admin-input" style={{ minWidth: 140 }} />
            <input name="name" placeholder="Display name" value={newPlan.name} onChange={handleNewPlanChange} className="admin-input" style={{ minWidth: 160 }} />
            <input name="price" type="number" step="0.01" placeholder="Price" value={newPlan.price} onChange={handleNewPlanChange} className="admin-input" style={{ width: 90 }} />
            <select name="currency" value={newPlan.currency} onChange={handleNewPlanChange} className="admin-select" style={{ width: 80 }}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            <select name="billing_interval" value={newPlan.billing_interval} onChange={handleNewPlanChange} className="admin-select" style={{ width: 130 }}>
              <option value="per_interview">Per interview</option>
              <option value="one-time">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input name="description" placeholder="Description (optional)" value={newPlan.description} onChange={handleNewPlanChange} className="admin-input" style={{ minWidth: 200 }} />
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
                        <input defaultValue={p.name} onBlur={(e) => updatePlan(planIdForUpdate(p), { name: e.target.value })} className="admin-input" style={{ width: '100%', maxWidth: 160 }} />
                      </td>
                      <td>
                        <input type="number" step="0.01" defaultValue={p.price} onBlur={(e) => updatePlan(planIdForUpdate(p), { price: Number(e.target.value) })} className="admin-input" style={{ width: 80 }} />
                      </td>
                      <td>
                        <select
                          className="admin-select"
                          style={{ width: 130 }}
                          value={p.billing_interval || 'per_interview'}
                          onChange={(e) => updatePlan(planIdForUpdate(p), { billing_interval: e.target.value })}
                        >
                          <option value="per_interview">Per interview</option>
                          <option value="one-time">One-time</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </td>
                      <td>
                        <input defaultValue={p.description} onBlur={(e) => updatePlan(planIdForUpdate(p), { description: e.target.value })} className="admin-input" style={{ width: '100%', maxWidth: 200 }} placeholder="Optional" />
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: p.isActive ? theme.primary : theme.textMuted }}>{p.isActive ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td>
                        <button type="button" className="admin-btn-secondary" onClick={() => updatePlan(planIdForUpdate(p), { is_active: !p.isActive })}>
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
      </div>
    </>
  );
}
