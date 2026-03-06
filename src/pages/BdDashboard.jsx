import React, { useEffect, useMemo, useState } from 'react'
import { BarChart2, Briefcase, CheckCircle, Clock, ExternalLink, Filter, LogOut, Search, Users } from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '3days', label: 'Last 3 days' },
  { value: '7days', label: 'Last 7 days' },
  { value: '15days', label: 'Last 15 days' },
  { value: 'all', label: 'All time' },
]

const STATUS_OPTIONS = ['pending', 'applied', 'interview', 'rejected', 'offer']

export default function BdDashboard() {
  const { user, logout } = useAuth()
  const [range, setRange] = useState('7days')
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState([])
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [myUsers, setMyUsers] = useState([])
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

  useEffect(() => {
    if (!user || (user.role !== 'bd' && user.role !== 'admin')) return
    api.get('/bd/my-users')
      .then((res) => setMyUsers(res.data || []))
      .catch(() => setMyUsers([]))
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
      { pending: 0, applied: 0, interview: 0, rejected: 0, offer: 0 },
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
          BD Portal
        </div>
        <div style={{ marginBottom: 24, fontSize: 13, color: 'var(--gray)' }}>
          Logged in as <strong>{user.email}</strong>
        </div>
        <div style={styles.nav}>
          <div style={{ ...styles.navItem, background: 'rgba(79,70,229,0.06)', color: 'var(--primary)', fontWeight: 600 }}>
            <BarChart2 size={18} />
            Leads dashboard
          </div>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <button
            type="button"
            onClick={logout}
            style={{
              ...styles.navItem,
              color: 'var(--gray)',
              background: 'transparent',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.searchBar}>
            <Search size={18} color="var(--gray-light)" />
            <input type="text" placeholder="Search leads (client-side soon)" style={styles.searchInput} disabled />
          </div>
          <div style={styles.profileArea}>
            <div style={{ textAlign: 'right', marginRight: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{user.name || 'BD'}</div>
              <div style={{ fontSize: 12, color: 'var(--gray)' }}>Role: {user.role}</div>
            </div>
            <div style={styles.avatar}>{initials}</div>
          </div>
        </header>

        <div style={styles.content}>
          <h1 style={styles.welcome}>BD lead dashboard</h1>
          <p style={styles.subtitle}>
            Create leads, track assignments, and monitor your funnel. This view uses the same backend APIs as the admin
            panel.
          </p>

          <section style={styles.statsGrid}>
            <StatCard
              icon={<Briefcase />}
              label="Total leads"
              value={stats.total}
              accent="#4F46E5"
            />
            <StatCard
              icon={<Clock />}
              label="Pending"
              value={stats.byStatus.pending || 0}
              accent="#F59E0B"
            />
            <StatCard
              icon={<CheckCircle />}
              label="Applied / Interview"
              value={(stats.byStatus.applied || 0) + (stats.byStatus.interview || 0)}
              accent="#22C55E"
            />
            <StatCard
              icon={<Users />}
              label="Offers"
              value={stats.byStatus.offer || 0}
              accent="#0EA5E9"
            />
          </section>

          <section style={{ marginTop: 32, marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Create new lead</h2>
            </div>
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
              <button type="submit" disabled={creating} style={styles.primaryBtn}>
                {creating ? 'Creating...' : 'Add lead'}
              </button>
            </form>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Your leads</h2>
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
                    <tr>
                      <th>Job</th>
                      <th>Company</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Job link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>{lead.job_title || '—'}</td>
                        <td>{lead.company_name || '—'}</td>
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
                    ))}
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
      <div style={{ ...styles.statIcon, background: `${accent}15`, color: accent }}>{icon}</div>
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
    background: '#F8FAFF',
    fontFamily: 'var(--font-primary)',
  },
  sidebar: {
    width: '260px',
    background: 'white',
    borderRight: '1px solid var(--gray-border)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--dark)',
    marginBottom: '32px',
  },
  logoIcon: {
    width: '28px',
    height: '28px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    borderRadius: '8px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: 14,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    height: '72px',
    background: 'white',
    borderBottom: '1px solid var(--gray-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#F0F4FF',
    padding: '8px 16px',
    borderRadius: '20px',
    width: '260px',
  },
  searchInput: {
    border: 'none',
    background: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
  },
  profileArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--primary)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
  },
  content: {
    padding: '32px 32px 40px',
    maxWidth: '1100px',
  },
  welcome: {
    fontSize: '28px',
    fontWeight: '800',
    color: 'var(--dark)',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--gray)',
    fontSize: '15px',
    marginBottom: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid var(--gray-border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--dark)',
    lineHeight: '1',
    marginBottom: '2px',
  },
  statLabel: {
    color: 'var(--gray)',
    fontSize: '13px',
    fontWeight: '500',
  },
  input: {
    borderRadius: 8,
    border: '1px solid var(--gray-border)',
    padding: '8px 10px',
    fontSize: 14,
  },
  primaryBtn: {
    padding: '8px 16px',
    borderRadius: 999,
    border: 'none',
    background: 'var(--primary)',
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  select: {
    borderRadius: 999,
    border: '1px solid var(--gray-border)',
    padding: '6px 12px',
    fontSize: 13,
    background: 'white',
  },
  emptyCard: {
    background: 'white',
    borderRadius: 12,
    border: '1px solid var(--gray-border)',
    padding: 20,
  },
  tableWrapper: {
    marginTop: 8,
    borderRadius: 12,
    border: '1px solid var(--gray-border)',
    overflow: 'hidden',
    background: 'white',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  statusSelect: {
    borderRadius: 999,
    border: '1px solid var(--gray-border)',
    padding: '4px 10px',
    fontSize: 13,
    background: 'white',
  },
  linkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid var(--gray-border)',
    background: 'white',
    color: 'var(--primary)',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
  },
}

