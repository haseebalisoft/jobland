import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../services/api.js';
import '../../../components/mock-interviews/mockInterviews.css';

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
      navigate(`/dashboard/mock-interviews/session/${res.data.sessionId}`, {
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

  return (
    <DashboardLayout userName={user?.name || ''} userInitials={initials}>
      <div className="mi-page">
        <div className="mi-setup">
          <h2>{scenario.title}</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>{scenario.description}</p>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Estimated duration: <strong>{scenario.duration_mins} minutes</strong>
          </p>
          {focus.length > 0 && (
            <div style={{ margin: '16px 0' }}>
              <strong style={{ fontSize: 14 }}>Key focus areas</strong>
              <ul style={{ marginTop: 8 }}>
                {focus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <h3 style={{ fontSize: 16, marginTop: 24 }}>Prepare your context</h3>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Auto-filled from your profile where available. Edit before starting.
          </p>

          <form onSubmit={start} style={{ marginTop: 16 }}>
            <div className="mi-field">
              <label>Name</label>
              <input value={ctx.name} onChange={(e) => setCtx({ ...ctx, name: e.target.value })} required />
            </div>
            <div className="mi-field">
              <label>Current role</label>
              <input value={ctx.currentRole} onChange={(e) => setCtx({ ...ctx, currentRole: e.target.value })} />
            </div>
            <div className="mi-field">
              <label>Target role</label>
              <input value={ctx.targetRole} onChange={(e) => setCtx({ ...ctx, targetRole: e.target.value })} />
            </div>
            <div className="mi-field">
              <label>Years of experience</label>
              <input
                type="number"
                min="0"
                value={ctx.yearsExp}
                onChange={(e) => setCtx({ ...ctx, yearsExp: e.target.value })}
              />
            </div>
            <div className="mi-field">
              <label>Summary / notes</label>
              <textarea rows={4} value={ctx.summary} onChange={(e) => setCtx({ ...ctx, summary: e.target.value })} />
            </div>
            <button type="submit" className="mi-header__cta" disabled={saving} style={{ marginTop: 8 }}>
              {saving ? 'Starting…' : 'Start Interview'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
