import React, { useEffect, useMemo, useState } from 'react'
import { BarChart2, Briefcase, CheckCircle, Clock, ExternalLink, Filter, LogOut, Search, Users, Lock } from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 days' },
  { value: '7days', label: 'Last 7 days' },
  { value: '15days', label: 'Last 15 days' },
  { value: 'all', label: 'All time' },
]

// job_assignments.status enum in 001_initial: pending, assigned, completed, failed
const STATUS_OPTIONS = ['pending', 'assigned', 'completed', 'failed']

const theme = {
  primary: '#0d9488',
  primaryDark: '#0f766e',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  slate: '#0f172a',
  slateLight: '#1e293b',
  bg: '#f0fdfa',
  cardBg: '#ffffff',
  border: '#ccfbf1',
  amber: '#f59e0b',
  rose: '#f43f5e',
  text: '#0f172a',
  textMuted: '#64748b',
}

export default function BdDashboard() {
  const { user, logout } = useAuth()
  const [range, setRange] = useState('7days')
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState([])
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
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
      <div style={{ padding: 40 }}>
        This BD dashboard is only available for BD or admin roles.
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

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}></div>
          HiredLogics
        </div>
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
          <button type="button" onClick={async () => {
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
          <button type="button" onClick={logout} style={styles.sidebarBtn}>
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
            <StatCard icon={<CheckCircle />} label="Assigned" value={stats.byStatus.assigned || 0} accent={theme.teal} />
            <StatCard icon={<Users />} label="Completed" value={stats.byStatus.completed || 0} accent={theme.cyan} />
            <StatCard icon={<Briefcase />} label="Failed" value={stats.byStatus.failed || 0} accent={theme.rose} />
          </section>

          <section style={{ marginTop: 28, marginBottom: 28 }}>
            <h2 style={styles.sectionTitle}>Assigned profiles</h2>
            {myUsersLoading ? (
              <div style={{ padding: 12 }}>Loading assigned users…</div>
            ) : myUsers.length === 0 ? (
              <div style={styles.emptyCard}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--gray)' }}>
                  No profiles assigned to you yet. Ask an admin to assign users to you from the Admin Dashboard.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
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
                      borderRadius: 8,
                      border: '1px solid var(--gray-border)',
                      background: myUsersLoading ? '#f3f4f6' : '#fff',
                      cursor: myUsersLoading ? 'default' : 'pointer',
                      fontSize: 13,
                      opacity: myUsersLoading ? 0.7 : 1,
                    }}
                  >
                    {myUsersLoading ? 'Refreshing…' : 'Refresh list'}
                  </button>
                </div>
                {myUsers.length === 0 && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--gray)' }}>
                    No users assigned to you yet. Ask an admin to assign users to you from the Admin Dashboard (Users → Assign BD), then click Refresh list.
                  </p>
                )}
                {myUsersError && (
                  <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>
                    {myUsersError}
                  </p>
                )}
              </div>
              <button type="submit" disabled={creating} style={styles.primaryBtn}>
                {creating ? 'Creating...' : 'Add lead'}
              </button>
            </form>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={styles.sectionTitle}>Your leads</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Filter size={16} color="var(--gray)" />
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
                <p style={{ margin: 0, color: 'var(--gray)' }}>
                  No leads in this range. Try a different filter or create a new lead above.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeaderCell}>Job</th>
                      <th style={styles.tableHeaderCell}>Company</th>
                      <th style={styles.tableHeaderCell}>Assigned user</th>
                      <th style={styles.tableHeaderCell}>Created</th>
                      <th style={styles.tableHeaderCell}>Status</th>
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
                            <select
                              value={lead.status || 'pending'}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              disabled={updatingId === lead.id}
                              style={styles.statusSelect}
                            >
                              {STATUS_OPTIONS.map((s) => (
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
                                style={styles.linkBtn}
                              >
                                <ExternalLink size={14} /> Open
                              </a>
                            ) : (
                              <span style={{ color: 'var(--gray-light)', fontSize: 13 }}>N/A</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
    <div style={styles.statCard}>
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
    fontFamily: 'var(--font-primary)',
  },
  sidebar: {
    width: '260px',
    background: `linear-gradient(180deg, ${theme.slate} 0%, ${theme.slateLight} 100%)`,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '4px',
  },
  logoSub: {
    fontSize: '11px',
    fontWeight: '600',
    color: theme.teal,
    letterSpacing: '0.05em',
    marginBottom: '28px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: `linear-gradient(135deg, ${theme.teal} 0%, ${theme.cyan} 100%)`,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.4)',
  },
  userEmail: {
    marginBottom: 24,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  userEmailLabel: { fontWeight: 400, marginRight: 4 },
  nav: { display: 'flex', flexDirection: 'column', gap: 6 },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    background: 'rgba(20, 184, 166, 0.2)',
    color: theme.teal,
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
    borderRadius: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column' },
  header: {
    height: 72,
    background: theme.cardBg,
    borderBottom: `1px solid ${theme.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#f0fdfa',
    padding: '10px 18px',
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
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.teal} 100%)`,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  content: {
    padding: '32px 32px 48px',
    maxWidth: 1200,
  },
  welcome: {
    fontSize: '28px',
    fontWeight: 800,
    color: theme.text,
    marginBottom: 8,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 15,
    marginBottom: 28,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 16,
  },
  statCard: {
    background: theme.cardBg,
    padding: 20,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
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
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: '10px 14px',
    fontSize: 14,
    background: theme.cardBg,
  },
  primaryBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.teal} 100%)`,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxShadow: `0 4px 14px ${theme.primary}40`,
  },
  select: {
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: '8px 14px',
    fontSize: 13,
    background: theme.cardBg,
  },
  emptyCard: {
    background: theme.cardBg,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    padding: 24,
  },
  tableWrapper: {
    marginTop: 8,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    overflow: 'hidden',
    background: theme.cardBg,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  statusSelect: {
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    padding: '6px 10px',
    fontSize: 13,
    background: theme.cardBg,
  },
  linkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    border: `1px solid ${theme.teal}`,
    background: 'rgba(20, 184, 166, 0.08)',
    color: theme.primary,
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    marginBottom: 12,
    margin: 0,
  },
  tableHeaderRow: {
    background: `linear-gradient(90deg, ${theme.slate} 0%, ${theme.slateLight} 100%)`,
  },
  tableHeaderCell: {
    textAlign: 'left',
    padding: '14px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: '0.03em',
  },
}

