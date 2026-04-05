import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../services/api.js';
import '../../../components/mock-interviews/mockInterviews.css';

function ringColor(score) {
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

function parseEvaluation(report) {
  let ev = report?.evaluation;
  if (ev == null && report?.scores && typeof report.scores === 'object') {
    ev = report.scores._evaluation;
  }
  if (typeof ev === 'string') {
    try {
      ev = JSON.parse(ev);
    } catch {
      ev = null;
    }
  }
  if (ev && typeof ev === 'object' && Object.keys(ev).length > 0) return ev;
  return null;
}

function normalizeVerdict(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  if (s.includes('no hire')) return 'No Hire';
  if (s.includes('maybe')) return 'Maybe';
  if (s === 'hire' || (s.includes('hire') && !s.includes('no'))) return 'Hire';
  return v || 'Maybe';
}

function verdictBannerStyle(verdict) {
  const v = normalizeVerdict(verdict);
  if (v === 'Hire') return { bg: '#dcfce7', color: '#166534', border: '#86efac' };
  if (v === 'No Hire') return { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' };
  return { bg: '#fef9c3', color: '#a16207', border: '#fde047' };
}

const BREAKDOWN_KEYS = [
  { key: 'technicalAccuracy', label: 'Technical accuracy' },
  { key: 'depthOfKnowledge', label: 'Depth of knowledge' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'relevance', label: 'Relevance' },
];

function truncate(s, n = 140) {
  const t = String(s || '');
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}

export default function ReportPage() {
  const { sessionId } = useParams();
  const auth = useAuth();
  const user = auth?.user;
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

  const ev = useMemo(() => (report ? parseEvaluation(report) : null), [report]);

  const score = report?.overall_score ?? report?.overallScore ?? 0;
  const color = ringColor(Number(score));

  const scoreBreakdown = useMemo(() => {
    if (ev?.scoreBreakdown) return ev.scoreBreakdown;
    return report?.scores || {};
  }, [ev, report]);

  if (loading || !report) {
    return (
      <DashboardLayout userName={user?.name || ''} userInitials={initials}>
        <div className="mi-report mi-loading">Loading report…</div>
      </DashboardLayout>
    );
  }

  /* ——— Legacy layout (reports generated before evaluation column) ——— */
  if (!ev) {
    const scores = report.scores || {};
    const strengths = report.strengths || [];
    const improvements = report.improvements || [];
    const better = report.better_answers || report.betterAnswers || [];
    const entries = Object.entries(scores);
    return (
      <DashboardLayout userName={user?.name || ''} userInitials={initials}>
        <div className="mi-page">
          <div className="mi-report mi-report--legacy">
            <h1 style={{ fontSize: 22, color: '#111827' }}>Interview report</h1>
            <p style={{ color: '#6b7280' }}>{report.scenario_title || 'Mock interview'}</p>
            <div className="mi-score-ring-wrap">
              <div className="mi-score-ring" style={{ border: `8px solid ${color}`, background: '#fff' }}>
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

  const banner = verdictBannerStyle(ev.verdict);
  const verdictLabel = normalizeVerdict(ev.verdict);
  const rightItems = Array.isArray(ev.answeredCorrectly) ? ev.answeredCorrectly : [];
  const wrongItems = Array.isArray(ev.answeredWrongOrWeak) ? ev.answeredWrongOrWeak : [];
  const notCovered = Array.isArray(ev.notCovered) ? ev.notCovered : [];
  const strongPoints = Array.isArray(ev.strongPoints) ? ev.strongPoints : [];
  const weakPoints = Array.isArray(ev.weakPoints) ? ev.weakPoints : [];
  const correctAnswers = Array.isArray(ev.correctAnswers) ? ev.correctAnswers : [];

  return (
    <DashboardLayout userName={user?.name || ''} userInitials={initials}>
      <div className="mi-page">
        <div className="mi-report mi-report-v2">
          <h1 style={{ fontSize: 22, color: '#111827', marginBottom: 4 }}>Interview evaluation</h1>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>{report.scenario_title || 'Mock interview'}</p>

          <div
            className="mi-verdict-banner"
            style={{
              background: banner.bg,
              color: banner.color,
              border: `1px solid ${banner.border}`,
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{verdictLabel}</div>
            {ev.verdictReason ? (
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, fontWeight: 500 }}>{ev.verdictReason}</p>
            ) : null}
          </div>

          <div className="mi-report-v2__score-row">
            <div className="mi-score-ring-wrap">
              <div
                className="mi-score-ring"
                style={{
                  border: `8px solid ${color}`,
                  background: '#fff',
                  color: '#111827',
                }}
              >
                {Math.round(Number(score))}
              </div>
              <span className="mi-report-v2__score-label">Overall score</span>
            </div>

            <div className="mi-report-v2__bars">
              {BREAKDOWN_KEYS.map(({ key, label }) => {
                const v = Number(scoreBreakdown[key] ?? 0);
                const pct = Math.min(100, Math.max(0, (v / 10) * 100));
                return (
                  <div key={key} className="mi-report-v2__bar-row">
                    <div className="mi-report-v2__bar-label">{label}</div>
                    <div className="mi-bar mi-bar--tight">
                      <i style={{ width: `${pct}%`, background: v >= 7 ? '#10b981' : v >= 5 ? '#eab308' : '#ef4444' }} />
                    </div>
                    <span className="mi-report-v2__bar-num">{v.toFixed(1)}/10</span>
                  </div>
                );
              })}
            </div>
          </div>

          <h2 className="mi-report-v2__h2">Correct vs weak</h2>
          <div className="mi-report-v2__split">
            <div className="mi-report-v2__col mi-report-v2__col--ok">
              <h3>
                <Check size={18} strokeWidth={2.5} /> Got right
              </h3>
              {rightItems.length === 0 ? (
                <p className="mi-report-v2__empty">None listed</p>
              ) : (
                rightItems.map((text, i) => (
                  <div key={i} className="mi-card mi-card--ok">
                    {text}
                  </div>
                ))
              )}
            </div>
            <div className="mi-report-v2__col mi-report-v2__col--bad">
              <h3>
                <X size={18} strokeWidth={2.5} /> Wrong / weak
              </h3>
              {wrongItems.length === 0 ? (
                <p className="mi-report-v2__empty">None listed</p>
              ) : (
                wrongItems.map((text, i) => (
                  <div key={i} className="mi-card mi-card--bad">
                    {text}
                  </div>
                ))
              )}
            </div>
          </div>

          <h2 className="mi-report-v2__h2">Question review</h2>
          <div className="mi-report-v2__table-wrap">
            <table className="mi-report-v2__table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Their answer</th>
                  <th />
                  <th>Model answer</th>
                </tr>
              </thead>
              <tbody>
                {correctAnswers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="mi-report-v2__empty">
                      No per-question breakdown in this report.
                    </td>
                  </tr>
                ) : (
                  correctAnswers.map((row, i) => {
                    const ok = row.wasCorrect === true;
                    return (
                      <tr key={i}>
                        <td>{row.question || '—'}</td>
                        <td className="mi-report-v2__truncate">{truncate(row.theyAnswered, 160)}</td>
                        <td className="mi-report-v2__icon">
                          {ok ? (
                            <Check size={20} color="#16a34a" strokeWidth={2.5} />
                          ) : (
                            <X size={20} color="#dc2626" strokeWidth={2.5} />
                          )}
                        </td>
                        <td>
                          <details className="mi-report-v2__details">
                            <summary>
                              Show expected answer <ChevronDown size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                            </summary>
                            <div className="mi-report-v2__detail-body">{row.correctAnswer || '—'}</div>
                          </details>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {notCovered.length > 0 && (
            <>
              <h2 className="mi-report-v2__h2">Topics not covered</h2>
              <div className="mi-report-v2__pills-bad">
                {notCovered.map((t) => (
                  <span key={t} className="mi-pill mi-pill--bad-outline">
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}

          <h2 className="mi-report-v2__h2">Strong points</h2>
          <ul className="mi-report-v2__quotes">
            {strongPoints.length === 0 ? (
              <li className="mi-report-v2__empty">None listed</li>
            ) : (
              strongPoints.map((s, i) => (
                <li key={i}>{s}</li>
              ))
            )}
          </ul>

          <h2 className="mi-report-v2__h2">Weak points</h2>
          <ul className="mi-report-v2__quotes mi-report-v2__quotes--weak">
            {weakPoints.length === 0 ? (
              <li className="mi-report-v2__empty">None listed</li>
            ) : (
              weakPoints.map((s, i) => (
                <li key={i}>{s}</li>
              ))
            )}
          </ul>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            <button type="button" className="mi-header__cta" onClick={() => navigate('/dashboard/mock-interviews')}>
              Retake interview
            </button>
            <button
              type="button"
              className="mi-header__cta"
              style={{ background: '#fff', color: '#2563eb', border: '2px solid #2563eb' }}
              onClick={() => navigate('/dashboard/mock-interviews/history')}
            >
              View all reports
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
