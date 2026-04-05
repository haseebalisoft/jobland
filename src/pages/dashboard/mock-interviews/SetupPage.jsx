import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Mic } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../services/api.js';
import { categoryBadgeStyle, getScenarioIconMeta } from '../../../components/mock-interview/scenarioIcons.jsx';
import '../../../components/mock-interviews/mockInterviews.css';
import '../../../components/mock-interview/interviewChat.css';

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1.5px solid #e5e7eb',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};

const fieldFocus = (e, on) => {
  if (on) {
    e.target.style.borderColor = '#2563eb';
    e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)';
  } else {
    e.target.style.borderColor = '#e5e7eb';
    e.target.style.boxShadow = 'none';
  }
};

export default function SetupPage() {
  const { scenarioId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ctx, setCtx] = useState({
    name: '',
    currentRole: '',
    targetRole: '',
    yearsExp: '',
    summary: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sc, prof] = await Promise.all([
          api.get(`/mock-interviews/scenarios/${scenarioId}`),
          api.get('/user/profile').catch(() => ({ data: {} })),
        ]);
        if (cancelled) return;
        setScenario(sc.data);
        const p = prof.data || {};
        const full = [p.firstName, p.lastName].filter(Boolean).join(' ');
        setCtx((c) => ({
          ...c,
          name: full || user?.name || '',
        }));
        const ext = await api.get('/cv/profile').catch(() => null);
        if (ext?.data?.personal) {
          const per = ext.data.personal;
          setCtx((c) => ({
            ...c,
            name: per.fullName || c.name,
            summary: per.summary || c.summary,
          }));
        }
        if (ext?.data?.professional) {
          const pr = ext.data.professional;
          setCtx((c) => ({
            ...c,
            currentRole: pr.title || c.currentRole,
            targetRole: pr.targetTitle || pr.title || c.targetRole,
            yearsExp: pr.yearsOfExperience != null ? String(pr.yearsOfExperience) : c.yearsExp,
          }));
        }
      } catch {
        navigate('/dashboard/mock-interviews');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scenarioId, navigate, user?.name]);

  const initials =
    String(user?.name || '')
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const start = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const userContext = {
        name: ctx.name.trim(),
        currentRole: ctx.currentRole.trim(),
        targetRole: ctx.targetRole.trim(),
        yearsExp: ctx.yearsExp ? Number(ctx.yearsExp) : undefined,
        summary: ctx.summary.trim(),
      };
      const res = await api.post('/mock-interviews/sessions', {
        scenarioId,
        userContext,
      });
      navigate(`/dashboard/mock-interviews/${scenarioId}/session/${res.data.sessionId}`, {
        state: { firstMessage: res.data.firstMessage, scenario: res.data.scenario },
      });
    } catch (err) {
      window.alert(err.response?.data?.message || err.message || 'Could not start session');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !scenario) {
    return (
      <DashboardLayout userName={user?.name || ''} userInitials={initials}>
        <div className="mi-setup mi-loading">Loading…</div>
      </DashboardLayout>
    );
  }

  const focus = Array.isArray(scenario.focus_areas) ? scenario.focus_areas : [];
  const badge = categoryBadgeStyle(scenario.category);
  const { Icon: ScenarioIcon, color: iconColor } = getScenarioIconMeta(scenario.icon_type);
  const duration = scenario.duration_mins || 25;

  return (
    <DashboardLayout userName={user?.name || ''} userInitials={initials}>
      <div className="mi-page" style={{ paddingBottom: 48 }}>
        <div className="ic-setup-grid">
          <div>
            <h1
              style={{
                margin: '0 0 12px',
                fontWeight: 800,
                fontSize: 26,
                color: '#111827',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {scenario.title}
            </h1>
            <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>{scenario.description}</p>
            <div style={{ marginBottom: 24 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#15803d',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 999,
                }}
              >
                <Clock size={13} strokeWidth={2} />
                Estimated duration: {duration} minutes
              </span>
            </div>

            {focus.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#374151', margin: '0 0 10px' }}>Key focus areas</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {focus.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '4px 0',
                        fontSize: 14,
                        color: '#374151',
                      }}
                    >
                      <span style={{ color: '#2563eb', fontSize: 18, lineHeight: 1.2 }} aria-hidden>
                        ●
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p style={{ fontWeight: 700, fontSize: 16, color: '#111827', margin: '0 0 4px' }}>Prepare your context</p>
            <p style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic', margin: '0 0 18px' }}>
              Auto-filled from your profile where available. Edit before starting.
            </p>

            <form onSubmit={start}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Name</label>
                <input
                  value={ctx.name}
                  onChange={(e) => setCtx({ ...ctx, name: e.target.value })}
                  required
                  style={fieldStyle}
                  onFocus={(e) => fieldFocus(e, true)}
                  onBlur={(e) => fieldFocus(e, false)}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Current role</label>
                <input
                  value={ctx.currentRole}
                  onChange={(e) => setCtx({ ...ctx, currentRole: e.target.value })}
                  style={fieldStyle}
                  onFocus={(e) => fieldFocus(e, true)}
                  onBlur={(e) => fieldFocus(e, false)}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Target role</label>
                <input
                  value={ctx.targetRole}
                  onChange={(e) => setCtx({ ...ctx, targetRole: e.target.value })}
                  style={fieldStyle}
                  onFocus={(e) => fieldFocus(e, true)}
                  onBlur={(e) => fieldFocus(e, false)}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Years of experience</label>
                <input
                  type="number"
                  min="0"
                  value={ctx.yearsExp}
                  onChange={(e) => setCtx({ ...ctx, yearsExp: e.target.value })}
                  style={fieldStyle}
                  onFocus={(e) => fieldFocus(e, true)}
                  onBlur={(e) => fieldFocus(e, false)}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Summary / notes</label>
                <textarea
                  rows={4}
                  value={ctx.summary}
                  onChange={(e) => setCtx({ ...ctx, summary: e.target.value })}
                  style={{ ...fieldStyle, resize: 'vertical', minHeight: 100 }}
                  onFocus={(e) => fieldFocus(e, true)}
                  onBlur={(e) => fieldFocus(e, false)}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background: '#2563eb',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 16,
                  border: 'none',
                  borderRadius: 12,
                  padding: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.85 : 1,
                  transition: 'background 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.background = '#1d4ed8';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Mic size={18} strokeWidth={2} />
                {saving ? 'Starting…' : 'Start Interview'}
              </button>
            </form>
          </div>

          <div
            style={{
              position: 'sticky',
              top: 24,
              background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
              border: '1px solid #bfdbfe',
              borderRadius: 16,
              padding: 28,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '5px 12px',
                borderRadius: 999,
                background: badge.bg,
                border: `1px solid ${badge.border}`,
                color: badge.text,
                marginBottom: 16,
              }}
            >
              {scenario.category || 'Interview'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ color: iconColor }}>
                <ScenarioIcon size={48} strokeWidth={1.75} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.25 }}>{scenario.title}</h3>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 0', fontSize: 14, color: '#047857', fontWeight: 600 }}>
                  <Clock size={15} />
                  {duration} minutes
                </p>
              </div>
            </div>
            {focus.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#374151', margin: '0 0 8px' }}>Focus areas</p>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5563', fontSize: 13, lineHeight: 1.55 }}>
                  {focus.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#374151', margin: '0 0 10px' }}>What to expect</p>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5563', fontSize: 13, lineHeight: 1.6 }}>
                <li>One focused question at a time, like a real hiring conversation.</li>
                <li>Follow-ups based on your answers — stay concise and specific.</li>
                <li>Session wraps with a personalized performance report.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
