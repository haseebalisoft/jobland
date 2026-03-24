import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart2, Briefcase, CheckCircle, Clock, ExternalLink, Filter, LogOut, Search, Users, Lock } from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import './BdDashboard.css'

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 days' },
  { value: '7days', label: 'Last 7 days' },
  { value: '15days', label: 'Last 15 days' },
  { value: 'all', label: 'All time' },
]

// job_assignments.status enum in 001_initial: pending, assigned, completed, failed
const STATUS_OPTIONS = ['pending', 'assigned', 'completed', 'failed']
// applications.current_status enum in 001_initial: applied, interview, acceptance, rejection, withdrawn
const APPLICATION_STATUS_OPTIONS = ['applied', 'interview', 'acceptance', 'rejection', 'withdrawn']

const theme = {
  primary: '#10B981',
  blue: '#2563EB',
  violet: '#7C3AED',
  slate: '#0F172A',
  slateLight: '#1E293B',
  bg: '#F1F5F9',
  cardBg: '#ffffff',
  border: '#E2E8F0',
  amber: '#F59E0B',
  rose: '#F43F5E',
  text: '#0F172A',
  textMuted: '#64748B',
}

export default function BdDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [range, setRange] = useState('7days')
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState([])
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [updatingAppId, setUpdatingAppId] = useState(null)
  const [myUsers, setMyUsers] = useState([])
  const [myUsersLoading, setMyUsersLoading] = useState(false)
  const [myUsersError, setMyUsersError] = useState('')
  const [newLead, setNewLead] = useState({
    job_title: '',
    company_name: '',
    job_link: '',
    assigned_user_id: '',
  })

  useEffect(() => {
    if (!user) return
    fetchLeads(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, user])

  const fetchMyUsers = () => {
    if (!user || (user.role !== 'bd' && user.role !== 'admin')) return
    setMyUsersLoading(true)
    setMyUsersError('')
    api.get('/bd/my-users')
      .then((res) => setMyUsers(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error(err)
        setMyUsers([])
        setMyUsersError('Could not load assigned users. Please try again.')
      })
      .finally(() => {
        setMyUsersLoading(false)
      })
  }

  useEffect(() => {
    fetchMyUsers()
  }, [user])

  const fetchLeads = async (r) => {
    setLoading(true)
    try {
      const res = await api.get('/leads/bd', { params: { range: r, limit: 100 } })
      setLeads(res.data.items || [])
    } catch (e) {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const total = leads.length
    const byStatus = leads.reduce(
      (acc, l) => {
        const s = l.status || 'pending'
        acc[s] = (acc[s] || 0) + 1
        return acc
      },
      { pending: 0, assigned: 0, completed: 0, failed: 0 },
    )
    return { total, byStatus }
  }, [leads])

  if (!user) return null

  if (user.role !== 'bd' && user.role !== 'admin') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        color: theme.text,
        fontFamily: 'var(--font-primary), system-ui, sans-serif',
        padding: 40,
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: 16, color: theme.textMuted }}>
          This BD dashboard is only available for BD or admin roles.
        </p>
      </div>
    )
  }

  const initials =
    (user.name || '')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'BD'

  const handleNewLeadChange = (e) => {
    const { name, value } = e.target
    setNewLead((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateLead = async (e) => {
    e.preventDefault()
    if (!newLead.job_title || !newLead.company_name || !newLead.job_link) return
    setCreating(true)
    try {
      const payload = {
        job_title: newLead.job_title,
        company_name: newLead.company_name,
        job_link: newLead.job_link,
      }
      if (newLead.assigned_user_id.trim()) {
        payload.assigned_user_id = newLead.assigned_user_id.trim()
      }
      const res = await api.post('/leads', payload)
      setLeads((prev) => [res.data, ...prev])
      setNewLead({
        job_title: '',
        company_name: '',
        job_link: '',
        assigned_user_id: '',
      })
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (leadId, status) => {
    setUpdatingId(leadId)
    try {
      const res = await api.patch(`/leads/${leadId}/status`, { status })
      setLeads((prev) => prev.map((l) => (l.id === leadId ? res.data : l)))
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleApplicationStatusChange = async (lead, status) => {
    if (!lead.application_id) {
      alert('Application record does not exist yet for this lead. Ask the user to mark it applied first.')
      return
    }
    setUpdatingAppId(lead.application_id)
    try {
      await api.patch(`/applications/${lead.application_id}/status`, { status })
      // Reflect application_status change locally
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, application_status: status } : l,
        ),
      )
      if (status === 'interview') {
        navigate(`/bd/interview?applicationId=${lead.application_id}`)
      }
    } catch (e) {
      console.error(e)
      alert(e.response?.data?.message || 'Failed to update application status')
    } finally {
      setUpdatingAppId(null)
    }
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <Link to="/" style={styles.logo}>
          <img src="/logo.png" alt="HiredLogics" style={styles.logoImg} />
          <span style={styles.logoText}>HiredLogics</span>
        </Link>
        <div style={styles.logoSub}>BD Portal</div>
        <div style={styles.userEmail}>
          <span style={styles.userEmailLabel}>Logged in as</span>
          <strong>{user.email}</strong>
        </div>
        <div style={styles.nav}>
          <div style={styles.navItemActive}>
            <BarChart2 size={18} />
            Leads dashboard
          </div>
        </div>
        <div style={styles.sidebarFooter}>
          <button type="button" className="bd-sidebar-btn" onClick={async () => {
            const current_password = window.prompt('Enter your current password:');
            if (!current_password) return;
            const new_password = window.prompt('Enter your new password (min 6 chars):');
            if (!new_password) return;
            try {
              await api.put('/settings/password', { current_password, new_password });
              alert('Password updated successfully.');
            } catch (e) {
              alert(e.response?.data?.message || 'Failed to update password');
            }
          }} style={styles.sidebarBtn}>
            <Lock size={18} />
            Change password
          </button>
          <button type="button" className="bd-sidebar-btn" onClick={logout} style={styles.sidebarBtn}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.searchBar}>
            <Search size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input type="text" placeholder="Search leads…" style={styles.searchInput} disabled />
          </div>
          <div style={styles.profileArea}>
            <div style={styles.profileText}>
              <span style={styles.profileName}>{user.name || 'BD'}</span>
              <span style={styles.profileRole}>{user.role}</span>
            </div>
            <div style={styles.avatar}>{initials}</div>
          </div>
        </header>

        <div style={styles.content}>
          <h1 style={styles.welcome}>Lead dashboard</h1>
          <p style={styles.subtitle}>
            Create leads, assign to users, and track status. All data syncs with the admin panel.
          </p>

          <section style={styles.statsGrid}>
            <StatCard icon={<Briefcase />} label="Total leads" value={stats.total} accent={theme.primary} />
            <StatCard icon={<Clock />} label="Pending" value={stats.byStatus.pending || 0} accent={theme.amber} />
            <StatCard icon={<CheckCircle />} label="Assigned" value={stats.byStatus.assigned || 0} accent={theme.primary} />
            <StatCard icon={<Users />} label="Completed" value={stats.byStatus.completed || 0} accent={theme.blue} />
            <StatCard icon={<Briefcase />} label="Failed" value={stats.byStatus.failed || 0} accent={theme.rose} />
          </section>

          <section style={{ marginTop: 28, marginBottom: 28 }}>
            <h2 style={styles.sectionTitle}>Assigned profiles</h2>
            {myUsersLoading ? (
              <div style={{ padding: 12 }}>Loading assigned users…</div>
            ) : myUsers.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={{ margin: 0, fontSize: 14, color: theme.textMuted }}>
                  No profiles assigned to you yet. Ask an admin to assign users to you from the Admin Dashboard.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <div className="bd-table-wrap">
                <table className="bd-table" style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeaderCell}>User</th>
                      <th style={styles.tableHeaderCell}>Email</th>
                      <th style={styles.tableHeaderCell}>Primary profile title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myUsers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.full_name || u.name || '—'}</td>
                        <td>{u.email}</td>
                        <td>{u.profile_title || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </section>

          <section style={{ marginTop: 32, marginBottom: 32 }}>
            <h2 style={styles.sectionTitle}>Create new lead</h2>
            <form
              onSubmit={handleCreateLead}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1.4fr auto', gap: 12, alignItems: 'center' }}
            >
              <input
                name="job_title"
                placeholder="Job title"
                value={newLead.job_title}
                onChange={handleNewLeadChange}
                style={styles.input}
              />
              <input
                name="company_name"
                placeholder="Company"
                value={newLead.company_name}
                onChange={handleNewLeadChange}
                style={styles.input}
              />
              <input
                name="job_link"
                placeholder="Job link (URL)"
                value={newLead.job_link}
                onChange={handleNewLeadChange}
                style={styles.input}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <select
                    name="assigned_user_id"
                    value={newLead.assigned_user_id}
                    onChange={handleNewLeadChange}
                    style={styles.input}
                  >
                    <option value="">Select user (assigned by admin)</option>
                    {myUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} ({u.email})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={fetchMyUsers}
                    disabled={myUsersLoading}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: `1px solid ${theme.border}`,
                      background: myUsersLoading ? theme.bg : theme.cardBg,
                      color: theme.text,
                      cursor: myUsersLoading ? 'default' : 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      opacity: myUsersLoading ? 0.7 : 1,
                    }}
                  >
                    {myUsersLoading ? 'Refreshing…' : 'Refresh list'}
                  </button>
                </div>
                {myUsers.length === 0 && (
                  <p style={{ margin: 0, fontSize: 13, color: theme.textMuted }}>
                    No users assigned to you yet. Ask an admin to assign users to you from the Admin Dashboard (Users → Assign BD), then click Refresh list.
                  </p>
                )}
                {myUsersError && (
                  <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>
                    {myUsersError}
                  </p>
                )}
              </div>
              <button type="submit" disabled={creating} className="bd-primary-btn" style={styles.primaryBtn}>
                {creating ? 'Creating...' : 'Add lead'}
              </button>
            </form>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={styles.sectionTitle}>Your leads</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Filter size={16} style={{ color: theme.textMuted }} />
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  style={styles.select}
                >
                  {RANGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 24 }}>Loading leads...</div>
            ) : leads.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={{ margin: 0, color: theme.textMuted }}>
                  No leads in this range. Try a different filter or create a new lead above.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <div className="bd-table-wrap">
                <table className="bd-table" style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeaderCell}>Job</th>
                      <th style={styles.tableHeaderCell}>Company</th>
                      <th style={styles.tableHeaderCell}>Assigned user</th>
                      <th style={styles.tableHeaderCell}>Created</th>
                      <th style={styles.tableHeaderCell}>Lead status</th>
                      <th style={styles.tableHeaderCell}>Application status</th>
                      <th style={styles.tableHeaderCell}>Job link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const assignedUser = lead.assigned_user_id
                        ? myUsers.find((u) => u.id === lead.assigned_user_id)
                        : null
                      return (
                        <tr key={lead.id}>
                          <td>{lead.job_title || '—'}</td>
                          <td>{lead.company_name || '—'}</td>
                          <td>{assignedUser ? (assignedUser.full_name || assignedUser.email) : '—'}</td>
                          <td>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</td>
                          <td>
                            <span style={{ fontSize: 13, color: theme.text }}>
                              {lead.status || 'pending'}
                            </span>
                          </td>
                          <td>
                            <select
                              value={lead.application_status || 'applied'}
                              onChange={(e) => handleApplicationStatusChange(lead, e.target.value)}
                              disabled={updatingAppId === lead.application_id || !lead.assigned_user_id}
                              style={styles.statusSelect}
                            >
                              {APPLICATION_STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {lead.job_link ? (
                              <a
                                href={lead.job_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bd-link-btn"
                                style={styles.linkBtn}
                                title="Open job link"
                              >
                                <ExternalLink size={14} /> Open
                              </a>
                            ) : (
                              <span style={{ color: theme.textMuted, fontSize: 13 }}>N/A</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="bd-stat-card" style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${accent}20`, color: accent }}>{icon}</div>
      <div>
        <div style={styles.statNumber}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: theme.bg,
    fontFamily: 'var(--font-primary), system-ui, sans-serif',
  },
  sidebar: {
    width: '260px',
    background: theme.slate,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 24px rgba(15, 23, 42, 0.12)',
    borderRight: `1px solid ${theme.slateLight}`,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    textDecoration: 'none',
    color: '#fff',
    marginBottom: '4px',
  },
  logoImg: {
    width: 36,
    height: 36,
    objectFit: 'contain',
    borderRadius: 8,
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  logoSub: {
    fontSize: '11px',
    fontWeight: 600,
    color: theme.primary,
    letterSpacing: '0.06em',
    marginBottom: '28px',
    textTransform: 'uppercase',
  },
  userEmail: {
    marginBottom: 24,
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  userEmailLabel: { fontWeight: 400, marginRight: 4 },
  nav: { display: 'flex', flexDirection: 'column', gap: 6 },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    background: 'rgba(16, 185, 129, 0.18)',
    color: theme.primary,
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  sidebarFooter: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  sidebarBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    borderRadius: 12,
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    background: 'transparent',
    border: '1px solid transparent',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  header: {
    height: 72,
    background: theme.cardBg,
    borderBottom: `1px solid ${theme.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: theme.bg,
    padding: '12px 18px',
    borderRadius: 12,
    width: 280,
    border: `1px solid ${theme.border}`,
  },
  searchInput: {
    border: 'none',
    background: 'none',
    outline: 'none',
    width: '100%',
    fontSize: 14,
    color: theme.text,
  },
  profileArea: { display: 'flex', alignItems: 'center', gap: 16 },
  profileText: { textAlign: 'right', marginRight: 8 },
  profileName: { display: 'block', fontSize: 14, fontWeight: 600, color: theme.text },
  profileRole: { fontSize: 12, color: theme.textMuted },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${theme.blue} 0%, ${theme.primary} 100%)`,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  content: {
    padding: '32px 32px 48px',
    maxWidth: 1280,
    width: '100%',
  },
  welcome: {
    fontSize: '26px',
    fontWeight: 800,
    color: theme.text,
    marginBottom: 8,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 1.5,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 18,
  },
  statCard: {
    background: theme.cardBg,
    padding: 22,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    transition: 'box-shadow 0.2s, border-color 0.2s',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 800,
    color: theme.text,
    lineHeight: 1,
    marginBottom: 2,
  },
  statLabel: { color: theme.textMuted, fontSize: 13, fontWeight: 500 },
  input: {
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: '12px 16px',
    fontSize: 14,
    background: theme.cardBg,
    color: theme.text,
  },
  primaryBtn: {
    padding: '12px 22px',
    borderRadius: 12,
    border: 'none',
    background: theme.primary,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: `0 4px 14px ${theme.primary}40`,
    transition: 'background 0.2s, box-shadow 0.2s',
  },
  select: {
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: '10px 14px',
    fontSize: 13,
    background: theme.cardBg,
    color: theme.text,
  },
  emptyCard: {
    background: theme.cardBg,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    padding: 28,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
  },
  tableWrapper: {
    marginTop: 8,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    overflow: 'hidden',
    background: theme.cardBg,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  statusSelect: {
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: '8px 12px',
    fontSize: 13,
    background: theme.cardBg,
    color: theme.text,
  },
  linkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 10,
    border: `1px solid ${theme.primary}`,
    background: 'rgba(16, 185, 129, 0.08)',
    color: theme.primary,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
    transition: 'background 0.2s, border-color 0.2s',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    marginBottom: 12,
    margin: 0,
  },
  tableHeaderRow: {
    background: theme.slateLight,
  },
  tableHeaderCell: {
    textAlign: 'left',
    padding: '14px 18px',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: '0.04em',
  },
}

