import React, { useEffect, useState } from 'react'
import { Bell, Search, User, FileText, CheckCircle, Clock, Settings, LogOut, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Dashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState('overview')
    const [leads, setLeads] = useState({ items: [], total: 0 })
    const [leadsLoading, setLeadsLoading] = useState(false)
    const [applyingId, setApplyingId] = useState(null)
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


    const handleMarkApplied = async (leadId) => {
        setApplyingId(leadId)
        try {
            await api.post(`/leads/${leadId}/applied`)
            setLeads((prev) => ({
                ...prev,
                items: prev.items.map((l) => (l.id === leadId ? { ...l, status: 'applied' } : l)),
            }))
        } catch (err) {
            console.error(err)
        } finally {
            setApplyingId(null)
        }
    }

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
        subscription?.plan_id || summary.user.subscription_plan || 'No active plan'
    const renewLabel = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString()
        : 'N/A'
    const totalApplications = leads.total > 0 ? leads.total : (stats?.total_applications ?? 0)
    const totalInterviews = stats?.total_interviews ?? 0

    return (
        <div style={styles.layout}>
            <aside style={styles.sidebar}>
                <div style={styles.logo}>
                    <div style={styles.logoIcon}></div>
                    Hiredlogic
                </div>
                <nav style={styles.nav}>
                    <NavItem icon={<User size={20} />} label="Overview" active={activeSection === 'overview'} onClick={() => setActiveSection('overview')} />
                    <NavItem icon={<FileText size={20} />} label="Create Skill" to="/onboarding" />
                    <NavItem icon={<CheckCircle size={20} />} label="Applications" active={activeSection === 'applications'} onClick={() => setActiveSection('applications')} />
                    <NavItem icon={<Settings size={20} />} label="Settings" to="/settings" />
                </nav>
                <div style={{ marginTop: 'auto' }}>
                    <button
                        type="button"
                        onClick={logout}
                        style={{ ...styles.navItem, color: 'var(--gray)', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            <main style={styles.main}>
                <header style={styles.header}>
                    <div style={styles.searchBar}>
                        <Search size={18} color="var(--gray-light)" />
                        <input type="text" placeholder="Search..." style={styles.searchInput} />
                    </div>
                    <div style={styles.profileArea}>
                        <button style={styles.iconBtn}>
                            <Bell size={20} />
                        </button>
                        <div style={styles.avatar}>
                            {initials}
                        </div>
                    </div>
                </header>

                <div style={styles.content}>
                    {activeSection === 'overview' && (
                        <>
                            <h1 style={styles.welcome}>Welcome back, {user.name}! 👋</h1>
                            <p style={styles.subtitle}>
                                {profile
                                    ? `Your profile: ${profile.title || 'No title'} · ${profile.experience_years || 0} years experience`
                                    : "Here is what's happening with your job search today."}
                            </p>

                            <div style={styles.statsGrid}>
                                <StatCard number={currentPlanLabel} label="Current Plan" color="#4F46E5" icon={<FileText />} />
                                <StatCard number={renewLabel} label="Renews on" color="#22C55E" icon={<Clock />} />
                                <StatCard number={totalApplications} label="Total Applications" color="#F59E0B" icon={<CheckCircle />} />
                            </div>

                            <div style={styles.recentActivity}>
                                <h3 style={styles.activityTitle}>Recent Activity</h3>
                                <div style={styles.activityCard}>
                                    <div style={styles.activityList}>
                                        {leads.items.length > 0 ? (
                                            leads.items.slice(0, 3).map((lead) => (
                                                <ActivityItem
                                                    key={lead.id}
                                                    title={lead.job_title || 'Job'}
                                                    desc={`${lead.company_name || ''} · ${lead.status || 'pending'}`}
                                                    time={lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ''}
                                                />
                                            ))
                                        ) : (
                                            <>
                                                <ActivityItem title="Application updated" desc="Google - Frontend Developer role moved to Interview" time="2h ago" />
                                                <ActivityItem title="Resume downloaded" desc="Professional_Resume_John_Doe.pdf" time="5h ago" />
                                                <ActivityItem title="Account created" desc="Successfully upgraded to Success Pack" time="1d ago" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeSection === 'applications' && (
                        <>
                            <h1 style={styles.welcome}>Applications</h1>
                            <p style={styles.subtitle}>
                                Leads from BDs assigned to you. Open the job link to apply, then mark as applied when done.
                            </p>
                            <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 14, color: 'var(--gray)' }}>Filter:</span>
                                {['today', '3days', '7days', '15days', 'all'].map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setLeadsRange(r)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 8,
                                            border: leadsRange === r ? '2px solid var(--primary)' : '1px solid var(--gray-border)',
                                            background: leadsRange === r ? 'rgba(79, 70, 229, 0.1)' : 'white',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            fontWeight: leadsRange === r ? 600 : 500,
                                        }}
                                    >
                                        {r === 'all' ? 'All time' : r === '3days' ? 'Last 3 days' : r === '7days' ? 'Last 7 days' : r === '15days' ? 'Last 15 days' : 'Today'}
                                    </button>
                                ))}
                            </div>
                            {leadsLoading ? (
                                <div style={{ padding: 24 }}>Loading applications...</div>
                            ) : leads.items.length === 0 ? (
                                <div style={styles.activityCard}>
                                    <p style={{ color: 'var(--gray)', margin: 0 }}>No leads assigned yet. Your BD will assign job leads here.</p>
                                </div>
                            ) : (
                                <div style={styles.leadsList}>
                                    {leads.items.map((lead) => (
                                        <div key={lead.id} style={styles.leadCard}>
                                            <div style={{ flex: 1 }}>
                                                <div style={styles.leadTitle}>{lead.job_title || 'Untitled role'}</div>
                                                <div style={styles.leadCompany}>{lead.company_name || '—'}</div>
                                                <div style={styles.leadMeta}>
                                                    <span style={statusBadgeStyle(lead.status)}>{lead.status}</span>
                                                    {lead.created_at && (
                                                        <span style={{ color: 'var(--gray)', fontSize: 13 }}>
                                                            Added {new Date(lead.created_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={styles.leadActions}>
                                                {lead.job_link && (
                                                    <a
                                                        href={lead.job_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={styles.linkBtn}
                                                    >
                                                        <ExternalLink size={16} /> Job link
                                                    </a>
                                                )}
                                                {lead.status === 'pending' && (
                                                    <button
                                                        type="button"
                                                        disabled={!!applyingId}
                                                        onClick={() => handleMarkApplied(lead.id)}
                                                        style={styles.primaryBtn}
                                                    >
                                                        {applyingId === lead.id ? 'Applying...' : 'Mark as applied'}
                                                    </button>
                                                )}
                                            </div>
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
    const colors = { pending: '#F59E0B', applied: '#3B82F6', interview: '#8B5CF6', rejected: '#EF4444', offer: '#22C55E' }
    return {
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: `${colors[status] || '#6B7280'}20`,
        color: colors[status] || '#6B7280',
    }
}

function NavItem({ icon, label, active, to, onClick }) {
    const style = {
        ...styles.navItem,
        background: active ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--gray)',
        fontWeight: active ? '600' : '500',
    }
    if (onClick) {
        return (
            <button type="button" onClick={onClick} style={{ ...style, border: 'none', background: style.background, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                {icon}
                {label}
            </button>
        )
    }
    return (
        <a href={to || '#'} style={style}>
            {icon}
            {label}
        </a>
    )
}

function StatCard({ number, label, color, icon }) {
    return (
        <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: `${color}15`, color }}>
                {icon}
            </div>
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
            <div style={styles.activityBlob} />
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
        background: '#F8FAFF',
        fontFamily: 'var(--font-primary)'
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
        fontSize: '24px',
        fontWeight: '800',
        color: 'var(--dark)',
        marginBottom: '48px',
    },
    logoIcon: {
        width: '32px',
        height: '32px',
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
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '8px',
        textDecoration: 'none',
        transition: 'all 0.2s',
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
        width: '300px',
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
        gap: '24px',
    },
    iconBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--gray)',
        cursor: 'pointer',
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
        padding: '40px 32px',
        maxWidth: '1000px',
    },
    welcome: {
        fontSize: '32px',
        fontWeight: '800',
        color: 'var(--dark)',
        marginBottom: '8px',
    },
    subtitle: {
        color: 'var(--gray)',
        fontSize: '16px',
        marginBottom: '32px',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginBottom: '40px',
    },
    statCard: {
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--gray-border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    statIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statNumber: {
        fontSize: '28px',
        fontWeight: '800',
        color: 'var(--dark)',
        lineHeight: '1',
        marginBottom: '4px',
    },
    statLabel: {
        color: 'var(--gray)',
        fontSize: '14px',
        fontWeight: '500',
    },
    recentActivity: {
        marginTop: '24px',
    },
    activityTitle: {
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '16px',
    },
    activityCard: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid var(--gray-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '24px',
    },
    activityList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    activityItem: {
        display: 'flex',
        gap: '16px',
    },
    activityBlob: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: 'var(--primary)',
        marginTop: '6px',
    },
    activityTitleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '4px',
    },
    actTitle: {
        fontWeight: '600',
        color: 'var(--dark)',
    },
    actTime: {
        color: 'var(--gray-light)',
        fontSize: '13px',
    },
    actDesc: {
        color: 'var(--gray)',
        fontSize: '14px',
    },
    leadsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    leadCard: {
        background: 'white',
        borderRadius: '16px',
        border: '1px solid var(--gray-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
    },
    leadTitle: {
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--dark)',
        marginBottom: '4px',
    },
    leadCompany: {
        fontSize: '14px',
        color: 'var(--gray)',
        marginBottom: '8px',
    },
    leadMeta: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    leadActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
    },
    linkBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid var(--gray-border)',
        background: 'white',
        color: 'var(--primary)',
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 500,
    },
    primaryBtn: {
        padding: '8px 16px',
        borderRadius: 8,
        border: 'none',
        background: 'var(--primary)',
        color: 'white',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
    },
}
