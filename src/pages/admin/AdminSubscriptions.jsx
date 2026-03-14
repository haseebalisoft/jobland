import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = { text: '#0F172A', textMuted: '#64748B' };

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    api.get('/admin/subscriptions').then((res) => setSubs(res.data || [])).catch(() => setSubs([]));
  }, []);

  const cancelSub = async (id) => {
    try {
      const res = await api.post(`/admin/subscriptions/${id}/cancel`);
      setSubs((list) => list.map((x) => ((x.id || x._id) === (res.data?.id ?? res.data?._id) ? { ...x, ...res.data } : x)));
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to cancel');
    }
  };

  return (
    <>
      <header className="admin-header">
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Subscriptions</h1>
        <span style={{ fontSize: 14, color: theme.textMuted }}>Active and canceled subscriptions</span>
      </header>
      <div className="admin-content">
        <section className="admin-section">
          <h2 className="admin-section-title"><FileText size={20} /> Subscriptions</h2>
          <p className="admin-helper">Cancel moves status to canceled.</p>
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
                          <button type="button" className="admin-btn-secondary" onClick={() => cancelSub(s.id || s._id)}>Cancel</button>
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
    </>
  );
}
