import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

export default function AdminMockInterviewAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get('/admin/mock-interviews/analytics')
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, []);

  if (!data) return <div style={{ padding: 24 }}>Loading analytics…</div>;

  const maxPop = Math.max(1, ...data.popularScenarios.map((p) => p.session_count));
  const maxDay = Math.max(1, ...data.sessionsPerDay.map((d) => d.sessions));

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <Link to="/admin/mock-interviews" style={{ color: '#2563eb' }}>
        ← Scenarios
      </Link>
      <h1 style={{ marginTop: 16 }}>Mock interview analytics</h1>
      <p style={{ color: '#6b7280' }}>
        Premium share of sessions: {(data.premiumConversionRate * 100).toFixed(1)}%
      </p>

      <h3>Popular scenarios</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.popularScenarios.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 200, fontSize: 13 }}>{p.title}</span>
            <div style={{ flex: 1, height: 10, background: '#e5e7eb', borderRadius: 999 }}>
              <div
                style={{
                  width: `${(p.session_count / maxPop) * 100}%`,
                  height: '100%',
                  background: '#2563eb',
                  borderRadius: 999,
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{p.session_count}</span>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 28 }}>Avg score by category</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.averageScoresByCategory.map((row) => (
          <div key={row.category} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 120, fontSize: 13 }}>{row.category}</span>
            <span style={{ fontSize: 13 }}>avg {row.avg_score ?? '—'}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>({row.sessions} sessions)</span>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 28 }}>Sessions per day (30d)</h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
        {data.sessionsPerDay.map((d) => (
          <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: '100%',
                height: `${(d.sessions / maxDay) * 100}%`,
                minHeight: 4,
                background: '#10b981',
                borderRadius: 4,
              }}
            />
            <span style={{ fontSize: 9, color: '#9ca3af', transform: 'rotate(-45deg)' }}>{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
