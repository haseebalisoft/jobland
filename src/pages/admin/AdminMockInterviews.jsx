import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

export default function AdminMockInterviews() {
  const [scenarios, setScenarios] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('scenarios');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/mock-interviews/scenarios'),
      api.get('/admin/mock-interviews/sessions', { params: { limit: 100 } }),
    ])
      .then(([sc, se]) => {
        setScenarios(sc.data.scenarios || []);
        setSessions(se.data.sessions || []);
      })
      .catch(() => {
        setScenarios([]);
        setSessions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const del = async (id) => {
    if (!window.confirm('Delete this scenario?')) return;
    try {
      await api.delete(`/admin/mock-interviews/scenarios/${id}`);
      load();
    } catch (e) {
      window.alert(e.response?.data?.message || e.message);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Mock interviews</h1>
        <Link to="/admin/mock-interviews/analytics" style={{ color: '#2563eb', fontWeight: 600 }}>
          Analytics →
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setTab('scenarios')} style={{ padding: '8px 14px', borderRadius: 8 }}>
          Scenarios
        </button>
        <button type="button" onClick={() => setTab('sessions')} style={{ padding: '8px 14px', borderRadius: 8 }}>
          Sessions
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : tab === 'scenarios' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: 8 }}>Title</th>
              <th style={{ padding: 8 }}>Category</th>
              <th style={{ padding: 8 }}>Mins</th>
              <th style={{ padding: 8 }}>Premium</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 8 }}>{s.title}</td>
                <td style={{ padding: 8 }}>{s.category}</td>
                <td style={{ padding: 8 }}>{s.duration_mins}</td>
                <td style={{ padding: 8 }}>{s.is_premium ? 'Yes' : 'No'}</td>
                <td style={{ padding: 8 }}>
                  <button type="button" onClick={() => del(s.id)} style={{ color: '#ef4444' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: 8 }}>User</th>
              <th style={{ padding: 8 }}>Scenario</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Started</th>
              <th style={{ padding: 8 }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: 8 }}>{s.user_name || s.user_email}</td>
                <td style={{ padding: 8 }}>{s.scenario_title}</td>
                <td style={{ padding: 8 }}>{s.status}</td>
                <td style={{ padding: 8 }}>{s.started_at ? new Date(s.started_at).toLocaleString() : ''}</td>
                <td style={{ padding: 8 }}>{s.report_score ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
