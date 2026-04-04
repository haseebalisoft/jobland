import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../services/api.js';
import '../../../components/mock-interviews/mockInterviews.css';

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const initials =
    String(user?.name || '')
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  useEffect(() => {
    api
      .get('/mock-interviews/history', { params: { limit: 50 } })
      .then((res) => setSessions(res.data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout userName={user?.name || ''} userInitials={initials}>
      <div className="mi-page">
        <div className="mi-setup">
          <h2>Past mock interviews</h2>
          {loading ? (
            <p className="mi-loading">Loading…</p>
          ) : sessions.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No sessions yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {sessions.map((s) => (
                <li
                  key={s.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong>{s.scenario_title}</strong>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      {s.started_at ? new Date(s.started_at).toLocaleString() : ''} · {s.status}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {s.score != null && <span style={{ fontWeight: 700 }}>Score: {s.score}</span>}
                    <button
                      type="button"
                      className="mi-card__start"
                      onClick={() => navigate(`/dashboard/mock-interviews/session/${s.id}/report`)}
                    >
                      View report
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
