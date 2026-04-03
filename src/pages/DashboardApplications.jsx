import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ExternalLink } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import DashboardLayout from '../components/layout/DashboardLayout.jsx'
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

export default function DashboardApplications() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [leads, setLeads] = useState({ items: [], total: 0 })
    const [leadsLoading, setLeadsLoading] = useState(false)
    const [leadsRange, setLeadsRange] = useState('all')
    const [expandedDescriptions, setExpandedDescriptions] = useState({})
    const [showNotifications, setShowNotifications] = useState(false)
    const [readNotificationIds, setReadNotificationIds] = useState(() => {
        try {
            const raw = localStorage.getItem('dashboard_read_notification_ids')
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    })
    const notificationRef = useRef(null)

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

    const toggleDescription = (leadId) => {
        setExpandedDescriptions((prev) => ({ ...prev, [leadId]: !prev[leadId] }))
    }

    const handleOpenResume = async (applicationId) => {
        if (!applicationId) {
            window.alert('Application is not ready yet for this lead.')
            return
        }
        try {
            const res = await api.get(`/applications/${applicationId}/resume`, {
                responseType: 'blob',
            })
            const url = window.URL.createObjectURL(res.data)
            window.open(url, '_blank', 'noopener,noreferrer')
            window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
        } catch (err) {
            const status = err?.response?.status
            if (status === 404) {
                // Keep UI in sync when backend has no canonical resume for this application.
                setLeads((prev) => ({
                    ...prev,
                    items: (prev.items || []).map((item) => (
                        item.application_id === applicationId
                            ? { ...item, has_resume: false, resume_source: null, resume_uploaded_at: null }
                            : item
                    )),
                }))
                window.alert('No resume is currently attached to this application. Please upload one first.')
                return
            }
            console.error(err)
            window.alert('Failed to open resume.')
        }
    }

    const handleUploadResumeForLead = (lead) => {
        if (!lead?.application_id) {
            window.alert('Application is not ready yet for this lead.')
            return
        }
        const picker = document.createElement('input')
        picker.type = 'file'
        picker.accept = 'application/pdf'
        picker.onchange = async () => {
            const file = picker.files?.[0]
            if (!file) return
            const formData = new FormData()
            formData.append('resume', file)
            formData.append('source', 'user_provided')
            try {
                await api.post(`/applications/${lead.application_id}/resume`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
                fetchLeads()
            } catch (err) {
                window.alert(err.response?.data?.message || 'Failed to upload resume.')
            }
        }
        picker.click()
    }

    const handleUseSavedResumeForLead = async (lead) => {
        if (!lead?.application_id) {
            window.alert('Application is not ready yet for this lead.')
            return
        }
        try {
            let listRes
            try {
                listRes = await api.get('/cv/saved')
            } catch (err) {
                if (err?.response?.status === 404) {
                    listRes = await api.get('/cv/saved-resumes')
                } else {
                    throw err
                }
            }
            const items = Array.isArray(listRes.data) ? listRes.data : []
            if (items.length === 0) {
                window.alert('You have no saved resume versions yet. Save one from Resume Maker first.')
                return
            }
            const choiceText = items
                .map((item, index) => `${index + 1}. ${item.title} (${new Date(item.created_at).toLocaleDateString()})`)
                .join('\n')
            const selected = window.prompt(`Select saved resume number:\n${choiceText}`, '1')
            const selectedIndex = Number(selected) - 1
            if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= items.length) return
            const picked = items[selectedIndex]
            try {
                await api.post(`/applications/${lead.application_id}/attach-saved-resume`, {
                    saved_resume_id: picked.id,
                })
            } catch (err) {
                if (err?.response?.status === 404) {
                    await api.post(`/applications/${lead.application_id}/use-saved-resume`, {
                        saved_resume_id: picked.id,
                    })
                } else {
                    throw err
                }
            }
            fetchLeads()
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to attach saved resume.'
            if (msg === 'Route not found') {
                window.alert('Saved resume route not found on backend. Please restart backend server and try again.')
                return
            }
            window.alert(msg)
        }
    }

    useEffect(() => {
        try {
            localStorage.setItem('dashboard_read_notification_ids', JSON.stringify(readNotificationIds))
        } catch {
            // Ignore storage errors (private mode, quota, etc.)
        }
    }, [readNotificationIds])

    useEffect(() => {
        const onClickOutside = (event) => {
            if (!notificationRef.current) return
            if (!notificationRef.current.contains(event.target)) {
                setShowNotifications(false)
            }
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    const notifications = useMemo(() => {
        const now = Date.now()
        const items = (leads.items || [])
            .filter((lead) => !!lead.interview_mode)
            .map((lead) => {
                const datePart = lead.interview_date ? new Date(lead.interview_date).toLocaleDateString() : ''
                const timePart = lead.interview_time || ''
                const whenLabel = [datePart, timePart].filter(Boolean).join(' · ') || 'Interview scheduled'
                const scheduledTs = lead.interview_date ? new Date(lead.interview_date).getTime() : null
                const isUpcoming = scheduledTs ? scheduledTs >= now - 86400000 : false
                return {
                    id: `interview-${lead.id}`,
                    title: `${lead.job_title || 'Interview'} at ${lead.company_name || 'Company'}`,
                    subtitle: whenLabel + (lead.interview_timezone ? ` (${lead.interview_timezone})` : ''),
                    type: isUpcoming ? 'Upcoming interview' : 'Interview update',
                    ts: scheduledTs || (lead.created_at ? new Date(lead.created_at).getTime() : 0),
                    leadId: lead.id,
                }
            })
            .sort((a, b) => b.ts - a.ts)

        return items
    }, [leads.items])

    const unreadCount = useMemo(
        () => notifications.filter((n) => !readNotificationIds.includes(n.id)).length,
        [notifications, readNotificationIds]
    )

    const toggleNotifications = () => {
        setShowNotifications((prev) => {
            const next = !prev
            if (!prev && notifications.length > 0) {
                setReadNotificationIds((current) => {
                    const allIds = notifications.map((n) => n.id)
                    const merged = Array.from(new Set([...(current || []), ...allIds]))
                    return merged
                })
            }
            return next
        })
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

    const initials =
        (user.name || '')
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'U'

    const rangeLabels = { today: 'Today', '3days': 'Last 3 days', '7days': 'Last 7 days', '15days': 'Last 15 days', all: 'All time' }

    return (
        <DashboardLayout userName={user.name || ''} userInitials={initials}>
            <main style={{ ...styles.main, background: '#f8fafc' }}>
                <header className="dashboard-header" style={styles.header}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Link to="/dashboard" style={{ fontSize: 14, fontWeight: 600, color: theme.textMuted, textDecoration: 'none' }}>
                            ← Home
                        </Link>
                        <span style={{ fontWeight: 700, color: theme.text, fontSize: 15 }}>Job applications</span>
                    </div>
                    <div style={styles.profileArea}>
                        <div style={styles.notificationWrapper} ref={notificationRef}>
                            <button
                                type="button"
                                className="dashboard-icon-btn"
                                style={styles.iconBtn}
                                aria-label="Notifications"
                                onClick={toggleNotifications}
                            >
                                <Bell size={20} />
                            </button>
                            {unreadCount > 0 && (
                                <span style={styles.notificationBadge}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                            {showNotifications && (
                                <div style={styles.notificationPanel}>
                                    <div style={styles.notificationPanelHeader}>Notifications</div>
                                    {notifications.length === 0 ? (
                                        <div style={styles.notificationEmpty}>No notifications yet.</div>
                                    ) : (
                                        <div style={styles.notificationList}>
                                            {notifications.slice(0, 8).map((item) => (
                                                <button
                                                    type="button"
                                                    key={item.id}
                                                    style={styles.notificationItem}
                                                    onClick={() => {
                                                        setShowNotifications(false)
                                                    }}
                                                >
                                                    <div style={styles.notificationType}>{item.type}</div>
                                                    <div style={styles.notificationTitle}>{item.title}</div>
                                                    <div style={styles.notificationSubtitle}>{item.subtitle}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={styles.avatar}>{initials}</div>
                    </div>
                </header>

                <div style={styles.content}>
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
                                                <div style={{ marginTop: 12 }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleDescription(lead.id)}
                                                        style={{
                                                            ...styles.secondaryBtn,
                                                            marginBottom: expandedDescriptions[lead.id] ? 8 : 0,
                                                        }}
                                                    >
                                                        {expandedDescriptions[lead.id] ? 'Hide job description' : 'View job description'}
                                                    </button>
                                                    {expandedDescriptions[lead.id] && (
                                                        <div style={styles.jobDescriptionBox}>
                                                            {lead.job_description || 'No job description was added for this lead yet.'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ marginTop: 10 }}>
                                                    {lead.application_id ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUploadResumeForLead(lead)}
                                                                    style={styles.secondaryBtn}
                                                                >
                                                                    Upload resume
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUseSavedResumeForLead(lead)}
                                                                    style={styles.secondaryBtn}
                                                                >
                                                                    Use saved
                                                                </button>
                                                                {lead.has_resume && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenResume(lead.application_id)}
                                                                        style={styles.secondaryBtn}
                                                                    >
                                                                        View resume used
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {lead.has_resume ? (
                                                                <span style={styles.resumeMetaText}>
                                                                    Source: {lead.resume_source === 'bd_provided' ? 'BD optimized/provided' : 'User provided'}
                                                                </span>
                                                            ) : (
                                                                <div style={styles.resumeEmptyText}>No resume uploaded for this application yet.</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div style={styles.resumeEmptyText}>Application is not ready yet for this lead.</div>
                                                    )}
                                                </div>
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
                </div>
            </main>
        </DashboardLayout>
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
    notificationWrapper: {
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 18,
        height: 18,
        borderRadius: 999,
        background: '#ef4444',
        color: 'white',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: '18px',
        textAlign: 'center',
        padding: '0 5px',
        border: '2px solid white',
    },
    notificationPanel: {
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 320,
        background: theme.cardBg,
        border: `1px solid ${theme.border}`,
        borderRadius: 14,
        boxShadow: '0 18px 35px rgba(15,23,42,0.14)',
        zIndex: 40,
        overflow: 'hidden',
    },
    notificationPanelHeader: {
        padding: '12px 14px',
        borderBottom: `1px solid ${theme.border}`,
        fontSize: 13,
        fontWeight: 700,
        color: theme.text,
        background: '#f8fafc',
    },
    notificationList: {
        maxHeight: 320,
        overflowY: 'auto',
    },
    notificationItem: {
        width: '100%',
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
        padding: '12px 14px',
        cursor: 'pointer',
        borderBottom: `1px solid ${theme.border}`,
    },
    notificationType: {
        fontSize: 11,
        fontWeight: 700,
        color: theme.violet,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    notificationTitle: {
        fontSize: 13,
        fontWeight: 600,
        color: theme.text,
        marginBottom: 3,
    },
    notificationSubtitle: {
        fontSize: 12,
        color: theme.textMuted,
    },
    notificationEmpty: {
        padding: '16px 14px',
        color: theme.textMuted,
        fontSize: 13,
    },
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
    secondaryBtn: {
        border: `1px solid ${theme.border}`,
        background: '#f8fafc',
        color: theme.text,
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 600,
        padding: '8px 12px',
        cursor: 'pointer',
    },
    jobDescriptionBox: {
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        background: '#f8fafc',
        color: theme.text,
        fontSize: 13,
        lineHeight: 1.5,
        padding: '10px 12px',
        whiteSpace: 'pre-wrap',
    },
    resumeEmptyText: {
        fontSize: 12,
        color: theme.textMuted,
    },
    resumeMetaText: {
        fontSize: 12,
        color: theme.textMuted,
    },
}

