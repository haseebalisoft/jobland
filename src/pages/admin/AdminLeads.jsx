import React, { useEffect, useState } from 'react';
import { Briefcase, ExternalLink } from 'lucide-react';
import api from '../../services/api.js';
import '../AdminDashboard.css';

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B' };

export default function AdminLeads() {
  const [leads, setLeads] = useState({ items: [], total: 0 });
  const [leadStats, setLeadStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/leads/filter', { params: { range: 'all', limit: 200 } }).catch(() => ({ data: { items: [], total: 0 } })),
      api.get('/leads/stats').catch(() => ({ data: null })),
    ]).then(([leadsRes, statsRes]) => {
      setLeads(leadsRes.data || { items: [], total: 0 });
      setLeadStats(statsRes.data || null);
    });
  }, []);

  return (
    <>
      <header className="admin-header">
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Leads</h1>
        <span style={{ fontSize: 14, color: theme.textMuted }}>All job assignments</span>
      </header>
      <div className="admin-content">
        <section className="admin-section">
          <h2 className="admin-section-title"><Briefcase size={20} /> Leads (all)</h2>
          <p className="admin-helper">All job assignments across BDs.</p>
          {leadStats && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="admin-tag">Total: {leadStats.total_leads ?? 0}</span>
              <span style={{ color: theme.textMuted }}>Pending: {leadStats.pending ?? 0}</span>
              <span style={{ color: theme.textMuted }}>Assigned: {leadStats.assigned ?? 0}</span>
              <span style={{ color: theme.primary }}>Completed: {leadStats.completed ?? 0}</span>
              <span style={{ color: '#F43F5E' }}>Failed: {leadStats.failed ?? 0}</span>
            </div>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {(leads.items || []).length === 0 ? (
                  <tr><td colSpan={5} className="admin-empty">No leads.</td></tr>
                ) : (
                  (leads.items || []).slice(0, 100).map((lead) => (
                    <tr key={lead.id}>
                      <td>{lead.job_title || '—'}</td>
                      <td>{lead.company_name || '—'}</td>
                      <td><span className="admin-tag">{lead.status || 'pending'}</span></td>
                      <td>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        {lead.job_link ? (
                          <a href={lead.job_link} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                            <ExternalLink size={14} /> Open
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {(leads.items || []).length > 100 && (
            <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 8 }}>Showing first 100 of {leads.total}.</p>
          )}
        </section>
      </div>
    </>
  );
}
