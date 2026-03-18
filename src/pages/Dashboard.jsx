import React, { useEffect, useState } from 'react'
import { Bell, Search, CheckCircle, Clock, ExternalLink, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import UserSidebar from '../components/UserSidebar.jsx'
import './Dashboard.css'

const theme = {
  primary: '#10B981',
  blue: '#2563EB',
  violet: '#7C3AED',
  slate: '#0F172A',
  slateLight: '#1E293B',
  bg: '#F1F5F9',
  cardBg: '#ffffff',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  teal: '#10B981',
  cyan: '#2563EB',
}

export default function Dashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState('overview')
    const [leads, setLeads] = useState({ items: [], total: 0 })
    const [leadsLoading, setLeadsLoading] = useState(false)
    const [leadsRange, setLeadsRange] = useState('all')

    useEffect(() => {
        let isMounted = true
        api.get('/dashboard')
            .then((res) => {
                if (isMounted) setSummary(res.data)
            })
            .catch(() => {
                if (isMounted) setSummary(null)
            })
            .finally(() => {
                if (isMounted) setLoading(false)
            })
        return () => {
            isMounted = false
        }
    }, [])

    const fetchLeads = () => {
        if (!user) return
        setLeadsLoading(true)
        api.get('/leads/user', { params: { range: leadsRange, limit: 100 } })
            .then((res) => {
                setLeads({ items: res.data.items || [], total: res.data.total ?? 0 })
            })
            .catch(() => {
                setLeads({ items: [], total: 0 })
            })
            .finally(() => setLeadsLoading(false))
    }

    useEffect(() => {
        if (!user) return
        fetchLeads()
    }, [user, leadsRange])


    if (!user) return null

    if (!user.emailVerified) {
        return <div style={{ padding: 40 }}>Please verify your email to access the dashboard.</div>
    }

    if (!user.isActive) {
        return (
            <div style={{ padding: 40 }}>
                No active subscription. Please choose a plan on the home page.
                <div style={{ marginTop: 16 }}>
                    <button
                        type="button"
                        onClick={() => navigate('/#pricing')}
                        style={{ padding: '8px 16px' }}
                    >
                        Go to pricing
                    </button>
                </div>
            </div>
        )
    }

    if (loading || !summary) {
        return <div style={{ padding: 40 }}>Loading dashboard...</div>
    }

    const { subscription, stats, profile } = summary
    const initials =
        (user.name || '')
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'U'
    const currentPlanLabel =
        summary.user.subscription_plan_name ||
        subscription?.plan_name ||
        summary.user.subscription_plan ||
        'No active plan'
    const renewLabel = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString()
        : 'N/A'
    const totalApplications = leads.total > 0 ? leads.total : (stats?.total_applications ?? 0)
    const totalInterviews = stats?.total_interviews ?? 0

    const rangeLabels = { today: 'Today', '3days': 'Last 3 days', '7days': 'Last 7 days', '15days': 'Last 15 days', all: 'All time' }

    return (
        <div className="dashboard-layout" style={styles.layout}>
            <UserSidebar />
            <main style={styles.main}>
                <header className="dashboard-header" style={styles.header}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button type="button" className="dashboard-tab" onClick={() => setActiveSection('overview')} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: activeSection === 'overview' ? theme.primary : 'transparent', color: activeSection === 'overview' ? 'white' : theme.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Overview</button>
                        <button type="button" className="dashboard-tab" onClick={() => setActiveSection('applications')} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: activeSection === 'applications' ? theme.primary : 'transparent', color: activeSection === 'applications' ? 'white' : theme.textMuted, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Applications</button>
                    </div>
                    <div style={styles.profileArea}>
                        <button type="button" className="dashboard-icon-btn" style={styles.iconBtn} aria-label="Notifications">
                            <Bell size={20} />
                        </button>
                        <div style={styles.avatar}>{initials}</div>
                    </div>
                </header>

                <div style={styles.content}>
                    {activeSection === 'overview' && (
                        <>
                            <h1 style={styles.welcome}>Welcome back, {user.name}</h1>
                            <p style={styles.subtitle}>
                                {profile
                                    ? `${profile.title || 'No title'} · ${profile.experience_years ?? 0} years experience`
                                    : "Here's what's happening with your job search."}
                            </p>

                            <div style={styles.statsGrid}>
                                <StatCard number={currentPlanLabel} label="Current plan" color={theme.primary} icon={<FileText size={22} />} />
                                <StatCard number={renewLabel} label="Renews on" color={theme.blue} icon={<Clock size={22} />} />
                                <StatCard number={totalApplications} label="Applications" color={theme.primary} icon={<CheckCircle size={22} />} />
                                <StatCard number={totalInterviews} label="Interviews" color={theme.violet} icon={<CheckCircle size={22} />} />
                            </div>

                            <section style={styles.section}>
                                <h2 style={styles.sectionTitle}>Recent activity</h2>
                                <div className="dashboard-activity-card" style={styles.activityCard}>
                                    {leads.items.length > 0 ? (
                                        <div style={styles.activityList}>
                                            {leads.items.slice(0, 5).map((lead) => {
                                                const hasInterview = !!lead.interview_mode;
                                                const title = hasInterview
                                                    ? `Interview: ${lead.job_title || 'Job'}`
                                                    : (lead.job_title || 'Job');
                                                const desc = hasInterview
                                                    ? `${lead.company_name || ''} · Interview scheduled`
                                                    : `${lead.company_name || ''} · ${lead.status || 'pending'}`;
                                                const when = hasInterview && (lead.interview_date || lead.interview_time)
                                                    ? [
                                                        lead.interview_date
                                                            ? new Date(lead.interview_date).toLocaleDateString()
                                                            : null,
                                                        lead.interview_time || null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')
                                                    : (lead.created_at
                                                        ? new Date(lead.created_at).toLocaleDateString()
                                                        : '');
                                                return (
                                                    <ActivityItem
                                                        key={lead.id}
                                                        title={title}
                                                        desc={desc}
                                                        time={when}
                                                    />
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p style={styles.emptyText}>No recent activity. Your assigned BD will add job leads here.</p>
                                    )}
                                </div>
                            </section>
                        </>
                    )}

                    {activeSection === 'applications' && (
                        <>
                            <h1 style={styles.welcome}>Applications</h1>
                            <p style={styles.subtitle}>
                                Job leads from your assigned BDs. Open the link to apply; status is updated by your BD or admin.
                            </p>
                            <div style={styles.filterRow}>
                                {(['today', '3days', '7days', '15days', 'all']).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        className="dashboard-filter-chip"
                                        onClick={() => setLeadsRange(r)}
                                        style={{
                                            ...styles.filterChip,
                                            ...(leadsRange === r ? styles.filterChipActive : {}),
                                        }}
                                    >
                                        {rangeLabels[r]}
                                    </button>
                                ))}
                            </div>
                            {leadsLoading ? (
                                <div style={styles.loadingState}>Loading applications…</div>
                            ) : leads.items.length === 0 ? (
                                <div className="dashboard-activity-card" style={styles.activityCard}>
                                    <p style={styles.emptyText}>No leads yet. Your BD will assign job leads here.</p>
                                </div>
                            ) : (
                                <div style={styles.leadsList}>
                                    {leads.items.map((lead) => (
                                        <div key={lead.id} className="dashboard-lead-card" style={styles.leadCard}>
                                            <div style={styles.leadBody}>
                                                <div style={styles.leadTitle}>{lead.job_title || 'Untitled role'}</div>
                                                <div style={styles.leadCompany}>{lead.company_name || '—'}</div>
                                                <div style={styles.leadMeta}>
                                                    <span style={statusBadgeStyle(lead.application_status || lead.status)}>
                                                        {lead.application_status || lead.status}
                                                    </span>
                                                    {lead.created_at && (
                                                        <span style={styles.leadDate}>Added {new Date(lead.created_at).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                                {lead.interview_mode && (
                                                    <div
                                                        style={{
                                                            marginTop: 14,
                                                            padding: '14px 16px',
                                                            borderRadius: 14,
                                                            background: 'linear-gradient(135deg, #EEF2FF 0%, #EFF6FF 100%)',
                                                            border: '1px solid rgba(129,140,248,0.35)',
                                                            display: 'flex',
                                                            alignItems: 'stretch',
                                                            gap: 16,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: 999,
                                                                background: '#4F46E5',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontSize: 16,
                                                                fontWeight: 700,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            i
                                                        </div>
                                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.6fr)', gap: 8 }}>
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#4F46E5', marginBottom: 4 }}>
                                                                    Interview scheduled
                                                                </div>
                                                                <div style={{ fontSize: 13, color: theme.textMuted, textTransform: 'capitalize' }}>
                                                                    {String(lead.interview_mode).replace('_', ' ')}
                                                                </div>
                                                                {lead.interview_link && (
                                                                    <a
                                                                        href={lead.interview_link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{
                                                                            marginTop: 6,
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            gap: 4,
                                                                            fontSize: 12,
                                                                            fontWeight: 600,
                                                                            color: '#2563EB',
                                                                            textDecoration: 'none',
                                                                        }}
                                                                    >
                                                                        <ExternalLink size={12} /> Join link
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <div style={{ textAlign: 'right', fontSize: 12, color: theme.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 2 }}>
                                                                {lead.interview_date && (
                                                                    <span style={{ fontWeight: 600, color: theme.text }}>
                                                                        {new Date(lead.interview_date).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                                {lead.interview_time && (
                                                                    <span>
                                                                        {lead.interview_time}
                                                                        {lead.interview_timezone ? ` (${lead.interview_timezone})` : ''}
                                                                    </span>
                                                                )}
                                                                {lead.duration_minutes != null && <span>{lead.duration_minutes} min</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {lead.job_link && (
                                                <a href={lead.job_link} target="_blank" rel="noopener noreferrer" className="dashboard-link-btn" style={styles.linkBtn}>
                                                    <ExternalLink size={16} /> Open link
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}

function statusBadgeStyle(status) {
    const colors = {
        pending: theme.slateLight,
        assigned: theme.primary,
        completed: theme.blue,
        failed: '#f43f5e',
        applied: theme.blue,
        interview: theme.violet,
        rejection: '#ef4444',
        acceptance: theme.primary,
    }
    const c = colors[status] || theme.textMuted
    return {
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        background: `${c}20`,
        color: c,
    }
}

function StatCard({ number, label, color, icon }) {
    return (
        <div className="dashboard-stat-card" style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${color}20`, color }}>{icon}</div>
            <div>
                <div style={styles.statNumber}>{number}</div>
                <div style={styles.statLabel}>{label}</div>
            </div>
        </div>
    )
}

function ActivityItem({ title, desc, time }) {
    return (
        <div style={styles.activityItem}>
            <div className="dashboard-activity-blob" style={styles.activityBlob} />
            <div style={{ flex: 1 }}>
                <div style={styles.activityTitleRow}>
                    <span style={styles.actTitle}>{title}</span>
                    <span style={styles.actTime}>{time}</span>
                </div>
                <div style={styles.actDesc}>{desc}</div>
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
        background: theme.bg,
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
    iconBtn: {
        background: 'none',
        border: 'none',
        color: theme.textMuted,
        cursor: 'pointer',
        padding: 10,
        borderRadius: 10,
        transition: 'color 0.2s, background 0.2s',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.blue} 100%)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 14,
    },
    content: { padding: '32px 32px 48px', maxWidth: 1100 },
    welcome: {
        fontSize: 28,
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
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        background: theme.cardBg,
        padding: 22,
        borderRadius: 18,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
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
        fontSize: 22,
        fontWeight: 800,
        color: theme.text,
        lineHeight: 1.2,
        marginBottom: 2,
    },
    statLabel: { fontSize: 13, color: theme.textMuted, fontWeight: 500 },
    section: { marginTop: 8 },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: theme.text,
        marginBottom: 12,
    },
    activityCard: {
        background: theme.cardBg,
        borderRadius: 18,
        border: `1px solid ${theme.border}`,
        padding: 26,
        boxShadow: '0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    },
    activityList: { display: 'flex', flexDirection: 'column', gap: 16 },
    activityItem: { display: 'flex', gap: 16 },
    activityBlob: {
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: theme.primary,
        marginTop: 6,
        flexShrink: 0,
    },
    activityTitleRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
    actTitle: { fontWeight: 600, color: theme.text, fontSize: 14 },
    actTime: { color: theme.textMuted, fontSize: 13 },
    actDesc: { color: theme.textMuted, fontSize: 14 },
    emptyText: { color: theme.textMuted, margin: 0, fontSize: 14 },
    filterRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' },
    filterChip: {
        padding: '8px 14px',
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: theme.cardBg,
        color: theme.text,
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
    },
    filterChipActive: {
        borderColor: theme.primary,
        background: 'rgba(16, 185, 129, 0.12)',
        color: theme.primary,
        fontWeight: 600,
    },
    loadingState: { padding: 24, color: theme.textMuted },
    leadsList: { display: 'flex', flexDirection: 'column', gap: 12 },
    leadCard: {
        background: theme.cardBg,
        borderRadius: 18,
        border: `1px solid ${theme.border}`,
        padding: '22px 26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        boxShadow: '0 2px 8px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
    },
    leadBody: { flex: 1 },
    leadTitle: { fontSize: 17, fontWeight: 700, color: theme.text, marginBottom: 4 },
    leadCompany: { fontSize: 14, color: theme.textMuted, marginBottom: 8 },
    leadMeta: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    leadDate: { color: theme.textMuted, fontSize: 13 },
    linkBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 18px',
        borderRadius: 12,
        border: `1px solid ${theme.primary}`,
        background: 'rgba(16, 185, 129, 0.12)',
        color: theme.primary,
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 600,
        flexShrink: 0,
        transition: 'background 0.2s, transform 0.2s, box-shadow 0.2s',
    },
}

