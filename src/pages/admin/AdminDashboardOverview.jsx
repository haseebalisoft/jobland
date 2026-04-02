import React, { useEffect, useState } from 'react';
import { Users, CreditCard, DollarSign, Briefcase, FileText, TrendingUp, UserPlus, BarChart3 } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = {
  primary: '#10B981',
  blue: '#2563EB',
  violet: '#7C3AED',
  slate: '#0F172A',
  text: '#0F172A',
  textMuted: '#64748B',
};

export default function AdminDashboardOverview() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/analytics')
      .then((res) => setAnalytics(res.data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <header className="admin-header">
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Dashboard</h1>
          <span style={{ fontSize: 14, color: theme.textMuted }}>Analytics overview</span>
        </header>
        <div className="admin-content">
          <p style={{ color: theme.textMuted }}>Loading analytics…</p>
        </div>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <header className="admin-header">
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Dashboard</h1>
        </header>
        <div className="admin-content">
          <p style={{ color: theme.textMuted }}>Failed to load analytics.</p>
        </div>
      </>
    );
  }

  const { summary, usersByRole, usersCreatedLast7Days, usersCreatedLast30Days, leadsByStatus, leadsOverTime, subscriptionsByPlan, applicationsByStatus, counts } = analytics;

  return (
    <>
      <header className="admin-header">
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Dashboard</h1>
        <span style={{ fontSize: 14, color: theme.textMuted }}>Analytics overview</span>
      </header>
      <div className="admin-content">
        {/* Top-level KPIs */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 18, marginBottom: 36 }}>
          <div className="admin-stat-card">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.primary}20`, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{summary?.totalUsers ?? 0}</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Total users</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.primary}20`, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{summary?.activeSubscriptions ?? 0}</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Active subscribers</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.blue}20`, color: theme.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={22} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>${Number(summary?.monthlyRevenue ?? 0).toFixed(2)}</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Monthly revenue</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.violet}20`, color: theme.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={22} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{counts?.totalLeads ?? 0}</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Total leads</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${theme.violet}20`, color: theme.violet, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: theme.text }}>{counts?.totalApplications ?? 0}</div>
              <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>Applications</div>
            </div>
          </div>
        </section>

        {/* Users & growth */}
        <section className="admin-section">
          <h2 className="admin-section-title">
            <UserPlus size={20} />
            User growth
          </h2>
          <div className="admin-dashboard-grid-3">
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>By role</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <span className="admin-tag">Users: {usersByRole?.user ?? 0}</span>
                <span className="admin-tag">BDs: {usersByRole?.bd ?? 0}</span>
                <span className="admin-tag">Admins: {usersByRole?.admin ?? 0}</span>
              </div>
            </div>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>New signups (last 7 days)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: theme.primary }}>{usersCreatedLast7Days}</div>
            </div>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>New signups (last 30 days)</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: theme.primary }}>{usersCreatedLast30Days}</div>
            </div>
          </div>
        </section>

        {/* Leads by status */}
        <section className="admin-section">
          <h2 className="admin-section-title">
            <BarChart3 size={20} />
            Leads by status
          </h2>
          <div className="admin-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <span className="admin-tag">Pending: {leadsByStatus?.pending ?? 0}</span>
              <span className="admin-tag">Assigned: {leadsByStatus?.assigned ?? 0}</span>
              <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.12)', borderRadius: 8, fontSize: 13, color: theme.primary, fontWeight: 500 }}>Completed: {leadsByStatus?.completed ?? 0}</span>
              <span style={{ padding: '4px 10px', background: 'rgba(244, 63, 94, 0.12)', borderRadius: 8, fontSize: 13, color: '#F43F5E', fontWeight: 500 }}>Failed: {leadsByStatus?.failed ?? 0}</span>
            </div>
          </div>
        </section>

        {/* Leads over time (simple bar chart) */}
        {Array.isArray(leadsOverTime) && leadsOverTime.length > 0 && (
          <section className="admin-section">
            <h2 className="admin-section-title">
              <TrendingUp size={20} />
              Leads created (last 30 days)
            </h2>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, minHeight: 120 }}>
                {leadsOverTime.slice(-14).map((d, i) => {
                  const max = Math.max(...leadsOverTime.map((x) => x.count), 1);
                  const h = (d.count / max) * 80;
                  return (
                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', height: 80, background: '#F1F5F9', borderRadius: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div style={{ width: '80%', height: `${h}%`, minHeight: d.count ? 4 : 0, background: theme.primary, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 10, color: theme.textMuted }}>{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>{d.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Subscriptions by plan */}
        <section className="admin-section">
          <h2 className="admin-section-title">Revenue by plan</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Active subs</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(subscriptionsByPlan) && subscriptionsByPlan.length > 0 ? (
                  subscriptionsByPlan.map((row) => (
                    <tr key={row.plan_id}>
                      <td><span className="admin-tag">{row.plan_name || row.plan_id}</span></td>
                      <td>{row.count}</td>
                      <td>${Number(row.revenue || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} className="admin-empty">No subscription data.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Applications by status */}
        {Object.keys(applicationsByStatus || {}).length > 0 && (
          <section className="admin-section">
            <h2 className="admin-section-title">Applications by status</h2>
            <div className="admin-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {Object.entries(applicationsByStatus).map(([status, count]) => (
                  <span key={status} className="admin-tag">{status}: {count}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Counts summary */}
        <section className="admin-section">
          <h2 className="admin-section-title">Counts</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <div className="admin-card" style={{ padding: 16, minWidth: 140 }}>
              <div style={{ fontSize: 12, color: theme.textMuted }}>Profiles</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>{counts?.totalProfiles ?? 0}</div>
            </div>
            <div className="admin-card" style={{ padding: 16, minWidth: 140 }}>
              <div style={{ fontSize: 12, color: theme.textMuted }}>Jobs</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>{counts?.totalJobs ?? 0}</div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
