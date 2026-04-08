import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, ExternalLink, Filter, MoreVertical, Search, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import DashboardLayout from '../components/layout/DashboardLayout.jsx'
import './JobTracker.css'

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

/** Kanban columns (BD “lead” rows without an application are grouped into Saved). */
const JT_COLUMNS = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
]

const USER_JOB_STATUS_LABELS = {
  saved: 'Saved',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
}

function boardRowKey(item) {
  if (!item) return ''
  return item.source === 'user' ? `user-${item.id}` : item.id
}

function normalizeUserJob(row) {
  return {
    source: 'user',
    id: row.id,
    job_title: row.title,
    company_name: row.company,
    job_link: row.job_url,
    job_description: row.notes || '',
    created_at: row.created_at,
    user_job_status: row.status,
    application_id: null,
  }
}

/** BD lead: use application pipeline; no application row yet → Saved (same column as early-stage leads). */
function columnKeyForLead(lead) {
  if (!lead?.application_id) return 'saved'
  const s = String(lead.application_status || '').toLowerCase()
  if (s === 'applied') return 'applied'
  if (s === 'interview') return 'interviewing'
  if (s === 'acceptance') return 'offer'
  if (s === 'rejection' || s === 'withdrawn') return 'rejected'
  return 'saved'
}

function columnKeyForBoardItem(item) {
  if (item?.source === 'user') {
    const s = String(item.user_job_status || 'saved').toLowerCase()
    if (s === 'saved') return 'saved'
    if (s === 'applied') return 'applied'
    if (s === 'interviewing') return 'interviewing'
    if (s === 'offer') return 'offer'
    return 'saved'
  }
  return columnKeyForLead(item)
}

/** Purple “Assigned” ribbon — BD-sourced leads or explicit assignment flags from API. */
function shouldShowAssignedBadge(lead) {
  if (!lead) return false
  if (lead.isAssigned === true) return true
  if (lead.assignedBy != null && String(lead.assignedBy).trim() !== '') return true
  if (lead.assigned_by != null && String(lead.assigned_by).trim() !== '') return true
  return lead.source === 'bd'
}

function formatAddedAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 0) return 'Added just now'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Added just now'
  if (mins < 60) return `Added ${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Added ${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 14) return `Added ${days} day${days === 1 ? '' : 's'} ago`
  return `Added ${d.toLocaleDateString()}`
}

export default function DashboardApplications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [leads, setLeads] = useState({ items: [], total: 0 })
  const [userJobs, setUserJobs] = useState([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [expandedDescriptions, setExpandedDescriptions] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const [detailLead, setDetailLead] = useState(null)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

  const fetchBoard = useCallback(() => {
    if (!user) return
    setLeadsLoading(true)
    Promise.all([
      api.get('/leads/user', { params: { limit: 100 } }),
      api.get('/user/jobs').catch(() => ({ data: { items: [] } })),
    ])
      .then(([leadsRes, jobsRes]) => {
        setLeads({ items: leadsRes.data.items || [], total: leadsRes.data.total ?? 0 })
        const raw = jobsRes.data?.items ?? jobsRes.data
        setUserJobs(Array.isArray(raw) ? raw : [])
      })
      .catch(() => {
        setLeads({ items: [], total: 0 })
        setUserJobs([])
      })
      .finally(() => setLeadsLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchBoard()
  }, [user, fetchBoard])

  useEffect(() => {
    const onDoc = (e) => {
      if (!(e.target.closest?.('.jt-dropdown') || e.target.closest?.('.jt-card__menu'))) {
        setOpenMenuId(null)
      }
      if (!e.target.closest?.('.jt-header-menu')) {
        setHeaderMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

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
        setLeads((prev) => ({
          ...prev,
          items: (prev.items || []).map((item) =>
            item.application_id === applicationId
              ? { ...item, has_resume: false, resume_source: null, resume_uploaded_at: null }
              : item,
          ),
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
        fetchBoard()
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
      fetchBoard()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to attach saved resume.'
      if (msg === 'Route not found') {
        window.alert('Saved resume route not found on backend. Please restart backend server and try again.')
        return
      }
      window.alert(msg)
    }
  }

  const handleUserJobStatus = async (lead, status) => {
    if (lead.source !== 'user') return
    try {
      await api.patch(`/user/jobs/${lead.id}`, { status })
      setOpenMenuId(null)
      fetchBoard()
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not update job.')
    }
  }

  const boardItems = useMemo(() => {
    const bd = (leads.items || []).map((l) => ({ ...l, source: 'bd' }))
    const uj = (userJobs || []).map(normalizeUserJob)
    return [...bd, ...uj]
  }, [leads.items, userJobs])

  const filteredItems = useMemo(() => {
    const items = boardItems
    const q = searchQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter((lead) => {
      const title = (lead.job_title || '').toLowerCase()
      const company = (lead.company_name || '').toLowerCase()
      return title.includes(q) || company.includes(q)
    })
  }, [boardItems, searchQuery])

  const grouped = useMemo(() => {
    const g = {
      saved: [],
      applied: [],
      interviewing: [],
      offer: [],
      rejected: [],
    }
    for (const lead of filteredItems) {
      const k = columnKeyForBoardItem(lead)
      if (g[k]) g[k].push(lead)
    }
    return g
  }, [filteredItems])

  const year = new Date().getFullYear()

  if (!user) return null

  if (!user.emailVerified) {
    return <div style={{ padding: 40 }}>Please verify your email to access the dashboard.</div>
  }

  if (!user.isActive) {
    return (
      <div style={{ padding: 40 }}>
        No active subscription. Please choose a plan on the home page.
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => navigate('/#pricing')} style={{ padding: '8px 16px' }}>
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

  return (
    <DashboardLayout userName={user.name || ''} userInitials={initials} narrowSidebar>
      <div className="jt-page">
        <header className="jt-toolbar" aria-label="Job search toolbar">
          <h1 className="jt-toolbar__title">
            My {year} Job Search
          </h1>
          <div className="jt-toolbar__center">
            <label className="jt-search">
              <Search className="jt-search__icon" size={16} aria-hidden />
              <input
                type="search"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="jt-toolbar__actions">
            <button type="button" className="jt-btn-outline">
              <Filter size={18} aria-hidden />
              Filter
            </button>
            <div className="jt-header-menu">
              <button
                type="button"
                className="jt-btn-icon"
                aria-label="More options"
                aria-expanded={headerMenuOpen}
                aria-haspopup="true"
                onClick={(e) => {
                  e.stopPropagation()
                  setHeaderMenuOpen((o) => !o)
                }}
              >
                <MoreVertical size={18} />
              </button>
              {headerMenuOpen && (
                <div className="jt-header-dropdown" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setHeaderMenuOpen(false); fetchBoard() }}>
                    Refresh board
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {leadsLoading ? (
          <div className="jt-loading">Loading your job board…</div>
        ) : (
          <div className="jt-board-wrap">
            <div className="jt-board">
              {JT_COLUMNS.map((col) => {
                const list = grouped[col.id] || []
                const count = list.length
                const jobLabel = count === 1 ? 'Job' : 'Jobs'
                return (
                  <section key={col.id} className={`jt-col jt-col--${col.id}`} aria-label={col.label}>
                    <div className="jt-col__head">
                      <span className="jt-col__name">{col.label}</span>
                      <span className={`jt-col__badge jt-col__badge--${col.id}`}>
                        {count} {jobLabel}
                      </span>
                    </div>
                    <div className="jt-col__body">
                      {list.length === 0 && (
                        <p className="jt-col__empty">
                          {col.id === 'saved'
                            ? 'No jobs yet. Your BD can assign leads here.'
                            : 'No jobs in this stage yet.'}
                        </p>
                      )}
                      {list.map((lead) => {
                        const rowKey = boardRowKey(lead)
                        return (
                        <article key={rowKey} className={`jt-card jt-card--${col.id}`}>
                          {shouldShowAssignedBadge(lead) && (
                            <span className="jt-card__assigned">Assigned</span>
                          )}
                          <button
                            type="button"
                            className="jt-card__menu"
                            aria-label="Job actions"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId((id) => (id === rowKey ? null : rowKey))
                            }}
                          >
                            <MoreVertical size={14} strokeWidth={2.5} />
                          </button>
                          {openMenuId === rowKey && (
                            <div className="jt-dropdown">
                              {lead.job_link && (
                                <a href={lead.job_link} target="_blank" rel="noopener noreferrer">
                                  Open job posting
                                </a>
                              )}
                              <button type="button" onClick={() => { setOpenMenuId(null); setDetailLead(lead) }}>
                                View details
                              </button>
                              {lead.source === 'user' &&
                                ['saved', 'applied', 'interviewing', 'offer']
                                  .filter((s) => s !== lead.user_job_status)
                                  .map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        handleUserJobStatus(lead, s)
                                      }}
                                    >
                                      Move to {USER_JOB_STATUS_LABELS[s] || s}
                                    </button>
                                  ))}
                              {lead.application_id && lead.source !== 'user' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      handleUploadResumeForLead(lead)
                                    }}
                                  >
                                    Upload resume
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      handleUseSavedResumeForLead(lead)
                                    }}
                                  >
                                    Use saved resume
                                  </button>
                                  {lead.has_resume && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null)
                                        handleOpenResume(lead.application_id)
                                      }}
                                    >
                                      View resume used
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          <div
                            className="jt-card__row"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setDetailLead(lead)
                              }
                            }}
                            onClick={() => {
                              setOpenMenuId(null)
                              setDetailLead(lead)
                            }}
                          >
                            <div className="jt-card__icon-wrap">
                              <Building2 size={18} strokeWidth={2} aria-hidden />
                            </div>
                            <div className="jt-card__main">
                              <div className="jt-card__title">{lead.job_title || 'Untitled role'}</div>
                              <div className="jt-card__company">
                                <Building2 size={11} strokeWidth={2} aria-hidden />
                                <span>{lead.company_name || '—'}</span>
                              </div>
                              {lead.interview_mode && (
                                <div className="jt-card__interview-pill">Interview scheduled</div>
                              )}
                            </div>
                          </div>
                          {lead.created_at && (
                            <div className="jt-card__time">{formatAddedAgo(lead.created_at)}</div>
                          )}
                        </article>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {detailLead && (
        <div
          className="jt-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetailLead(null)
          }}
        >
          <div className="jt-modal" role="dialog" aria-modal="true" aria-labelledby="jt-detail-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <h3 id="jt-detail-title" style={{ margin: 0 }}>
                {detailLead.job_title || 'Untitled role'}
              </h3>
              <button
                type="button"
                onClick={() => setDetailLead(null)}
                style={{
                  border: 'none',
                  background: '#f3f4f6',
                  borderRadius: 8,
                  padding: 6,
                  cursor: 'pointer',
                  color: '#64748b',
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: '0 0 16px', color: theme.textMuted, fontSize: 14 }}>
              {detailLead.company_name || '—'}
            </p>

            {detailLead.interview_mode && (
              <div
                style={{
                  marginBottom: 16,
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
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: '#4F46E5',
                        marginBottom: 4,
                      }}
                    >
                      Interview scheduled
                    </div>
                    <div style={{ fontSize: 13, color: theme.textMuted, textTransform: 'capitalize' }}>
                      {String(detailLead.interview_mode).replace('_', ' ')}
                    </div>
                    {detailLead.interview_link && (
                      <a
                        href={detailLead.interview_link}
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
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: 12,
                      color: theme.textMuted,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    {detailLead.interview_date && (
                      <span style={{ fontWeight: 600, color: theme.text }}>
                        {new Date(detailLead.interview_date).toLocaleDateString()}
                      </span>
                    )}
                    {detailLead.interview_time && (
                      <span>
                        {detailLead.interview_time}
                        {detailLead.interview_timezone ? ` (${detailLead.interview_timezone})` : ''}
                      </span>
                    )}
                    {detailLead.duration_minutes != null && <span>{detailLead.duration_minutes} min</span>}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => toggleDescription(boardRowKey(detailLead))}
                style={{
                  border: `1px solid ${theme.border}`,
                  background: '#f8fafc',
                  color: theme.text,
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                {expandedDescriptions[boardRowKey(detailLead)] ? 'Hide job description' : 'View job description'}
              </button>
              {expandedDescriptions[boardRowKey(detailLead)] && (
                <div
                  style={{
                    marginTop: 8,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    background: '#f8fafc',
                    color: theme.text,
                    fontSize: 13,
                    lineHeight: 1.5,
                    padding: '10px 12px',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {detailLead.job_description || 'No job description was added for this lead yet.'}
                </div>
              )}
            </div>

            {detailLead.source === 'user' ? (
              <p style={{ fontSize: 12, color: theme.textMuted, margin: 0 }}>
                Personal job entry. Use the card menu (⋯) to move it between Saved, Applied, Interviewing, and Offer.
              </p>
            ) : detailLead.application_id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleUploadResumeForLead(detailLead)}
                    style={{
                      border: `1px solid ${theme.border}`,
                      background: '#f8fafc',
                      color: theme.text,
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    Upload resume
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUseSavedResumeForLead(detailLead)}
                    style={{
                      border: `1px solid ${theme.border}`,
                      background: '#f8fafc',
                      color: theme.text,
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    Use saved
                  </button>
                  {detailLead.has_resume && (
                    <button
                      type="button"
                      onClick={() => handleOpenResume(detailLead.application_id)}
                      style={{
                        border: `1px solid ${theme.border}`,
                        background: '#f8fafc',
                        color: theme.text,
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '8px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      View resume used
                    </button>
                  )}
                </div>
                {detailLead.has_resume ? (
                  <span style={{ fontSize: 12, color: theme.textMuted }}>
                    Source:{' '}
                    {detailLead.resume_source === 'bd_provided' ? 'BD optimized/provided' : 'User provided'}
                  </span>
                ) : (
                  <div style={{ fontSize: 12, color: theme.textMuted }}>
                    No resume uploaded for this application yet.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: theme.textMuted }}>Application is not ready yet for this lead.</div>
            )}

            {detailLead.job_link && (
              <a
                href={detailLead.job_link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginTop: 16,
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
                }}
              >
                <ExternalLink size={16} /> Open link
              </a>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
