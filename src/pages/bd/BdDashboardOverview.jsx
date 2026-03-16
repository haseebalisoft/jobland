import React, { useEffect, useState } from 'react';
import { Briefcase, Users, Clock, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../../services/api.js';
import '../BdDashboard.css';

const theme = { primary: '#10B981', blue: '#2563EB', amber: '#F59E0B', rose: '#F43F5E', text: '#0F172A', textMuted: '#64748B' };

export default function BdDashboardOverview() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bd/analytics')
      .then((res) => setAnalytics(res.data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bd-content">
        <p style={{ color: theme.textMuted }}>Loading analytics…</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bd-content">
        <p style={{ color: theme.textMuted }}>Failed to load analytics.</p>
      </div>
    );
  }

  const { summary, leadsByStatus, leadsCreatedLast7Days, leadsCreatedLast30Days, leadsOverTime } = analytics;

  return (
    <div className="bd-content" style={{ width: '100%', minWidth: 0 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: theme.text, marginBottom: 8, letterSpacing: '-0.02em' }}>Dashboard</h1>
      <p style={{ color: theme.textMuted, fontSize: 15, marginBottom: 28 }}>Your lead and assignment overview.</p>

      {/* KPI cards - full width row */}
      <section className="bd-dashboard-kpi-grid" style={{ width: '100%', marginBottom: 32 }}>
        <div className="bd-stat-card" style={{ background: '#fff', padding: 22, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.primary}20`, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Briefcase size={22} /></div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{summary?.totalLeads ?? 0}</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Total leads</div>
          </div>
        </div>
        <div className="bd-stat-card" style={{ background: '#fff', padding: 22, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.blue}20`, color: theme.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={22} /></div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{summary?.assignedUsersCount ?? 0}</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Assigned profiles</div>
          </div>
        </div>
        <div className="bd-stat-card" style={{ background: '#fff', padding: 22, borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.amber}20`, color: theme.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={22} /></div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{summary?.unassignedLeadsCount ?? 0}</div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Unassigned leads</div>
          </div>
        </div>
      </section>

      {/* Leads by status */}
      <section style={{ width: '100%', marginBottom: 32 }}>
        <h2 className="bd-section-title"><Briefcase size={20} /> Leads by status</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ padding: '8px 14px', background: `${theme.amber}20`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: theme.amber }}>Pending: {leadsByStatus?.pending ?? 0}</span>
          <span style={{ padding: '8px 14px', background: `${theme.primary}20`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: theme.primary }}>Assigned: {leadsByStatus?.assigned ?? 0}</span>
          <span style={{ padding: '8px 14px', background: `${theme.blue}20`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: theme.blue }}>Completed: {leadsByStatus?.completed ?? 0}</span>
          <span style={{ padding: '8px 14px', background: `${theme.rose}20`, borderRadius: 10, fontSize: 14, fontWeight: 600, color: theme.rose }}>Failed: {leadsByStatus?.failed ?? 0}</span>
        </div>
      </section>

      {/* Growth - full width row */}
      <section style={{ width: '100%', marginBottom: 32 }}>
        <h2 className="bd-section-title"><TrendingUp size={20} /> Lead activity</h2>
        <div className="bd-dashboard-activity-grid" style={{ width: '100%' }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>Created (last 7 days)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.primary }}>{leadsCreatedLast7Days}</div>
          </div>
          <div style={{ background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>Created (last 30 days)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.primary }}>{leadsCreatedLast30Days}</div>
          </div>
        </div>
      </section>

      {/* Leads over time (simple bars) */}
      {Array.isArray(leadsOverTime) && leadsOverTime.length > 0 && (
        <section style={{ width: '100%', marginBottom: 32 }}>
          <h2 className="bd-section-title"><TrendingUp size={20} /> Leads created (last 30 days)</h2>
          <div style={{ width: '100%', background: '#fff', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              {leadsOverTime.slice(-14).map((d) => {
                const max = Math.max(...leadsOverTime.map((x) => x.count), 1);
                const h = (d.count / max) * 80;
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: '100%', height: 80, background: '#F1F5F9', borderRadius: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '80%', height: `${h}%`, minHeight: d.count ? 4 : 0, background: theme.primary, borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 10, color: theme.textMuted }}>{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{d.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Quick tip */}
      {(summary?.unassignedLeadsCount ?? 0) > 0 && (
        <section style={{ width: '100%', background: `${theme.amber}12`, padding: 16, borderRadius: 12, border: `1px solid ${theme.amber}40` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <AlertCircle size={18} style={{ color: theme.amber }} />
            <span style={{ fontWeight: 600, color: theme.text }}>Need attention</span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: theme.textMuted }}>
            You have {summary.unassignedLeadsCount} lead(s) with no assigned user. Go to <strong>Your leads</strong> to assign them, or create new leads from <strong>Create lead</strong>.
          </p>
        </section>
      )}
    </div>
  );
}
