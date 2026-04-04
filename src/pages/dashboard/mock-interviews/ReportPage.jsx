import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../services/api.js';
import '../../../components/mock-interviews/mockInterviews.css';

function ringColor(score) {
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

export default function ReportPage() {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
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
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/mock-interviews/sessions/${sessionId}/report`);
        if (!cancelled) setReport(data);
      } catch {
        try {
          const gen = await api.post(`/mock-interviews/sessions/${sessionId}/generate-report`);
          if (!cancelled) setReport(gen.data.report);
        } catch (e) {
          window.alert(e.response?.data?.message || 'Could not load report');
          navigate('/dashboard/mock-interviews');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate]);

  if (loading || !report) {
    return (
      <DashboardLayout userName={user?.name || ''} userInitials={initials}>
        <div className="mi-report mi-loading">Loading report…</div>
      </DashboardLayout>
    );
  }

  const score = report.overall_score ?? report.overallScore ?? 0;
  const scores = report.scores || {};
  const strengths = report.strengths || [];
  const improvements = report.improvements || [];
  const better = report.better_answers || report.betterAnswers || [];
  const color = ringColor(score);
  const entries = Object.entries(scores);

  return (
    <DashboardLayout userName={user?.name || ''} userInitials={initials}>
      <div className="mi-page">
        <div className="mi-report">
          <h1 style={{ fontSize: 22, color: '#111827' }}>Interview report</h1>
          <p style={{ color: '#6b7280' }}>{report.scenario_title || 'Mock interview'}</p>

          <div className="mi-score-ring-wrap">
            <div
              className="mi-score-ring"
              style={{
                border: `8px solid ${color}`,
                background: '#fff',
              }}
            >
              {score}
            </div>
          </div>

          <div className="mi-bars">
            {entries.map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 12, marginBottom: 4, textTransform: 'capitalize' }}>{k}</div>
                <div className="mi-bar">
                  <i style={{ width: `${Math.min(100, (Number(v) / 10) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <h3>Strengths</h3>
          <div className="mi-pills">
            {strengths.map((s, i) => (
              <span key={i} className="mi-pill mi-pill--ok">
                {typeof s === 'string' ? s : s.title || s.detail}
              </span>
            ))}
          </div>

          <h3 style={{ marginTop: 20 }}>Areas to improve</h3>
          <div className="mi-pills">
            {improvements.map((s, i) => (
              <span key={i} className="mi-pill mi-pill--warn">
                {typeof s === 'string' ? s : s.title || s.detail}
              </span>
            ))}
          </div>

          {better.length > 0 && (
            <>
              <h3 style={{ marginTop: 20 }}>Better answer suggestions</h3>
              {better.map((b, i) => (
                <details key={i} className="mi-acc">
                  <summary>{b.question || `Question ${i + 1}`}</summary>
                  <div style={{ padding: 12, fontSize: 14, lineHeight: 1.5 }}>{b.suggestedAnswer || b.suggested_answer}</div>
                </details>
              ))}
            </>
          )}

          {report.recommendations && (
            <p style={{ marginTop: 16, fontSize: 14, color: '#374151' }}>{report.recommendations}</p>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button type="button" className="mi-header__cta" onClick={() => navigate('/dashboard/mock-interviews')}>
              Retake Interview
            </button>
            <button
              type="button"
              className="mi-header__cta"
              style={{ background: '#fff', color: '#2563eb', border: '2px solid #2563eb' }}
              onClick={() => navigate('/dashboard/mock-interviews/history')}
            >
              View All Reports
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
