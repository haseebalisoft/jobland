import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import './Dashboard.css';

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
};

const QUICK_TEMPLATES = [
  {
    id: 'reschedule',
    label: 'Request to reschedule the interview',
    description: 'Change interview date or time.',
    followUps: [
      { id: 'current_slot', label: 'Current interview date & time (if known)', placeholder: 'e.g. 21 Mar, 3:00 PM CST', required: false },
      { id: 'preferred_slots', label: 'Preferred date(s) and time window(s)', placeholder: 'e.g. Any weekday after 4 PM CST', required: true },
      { id: 'timezone', label: 'Your timezone', placeholder: 'e.g. CST / EST / IST', required: true },
      { id: 'reason', label: 'Reason for rescheduling (short)', placeholder: 'e.g. Overlapping interview, personal commitment', required: true },
    ],
  },
  {
    id: 'interview_questions',
    label: 'Questions about my interview',
    description: 'Clarify interview format, panel, expectations, etc.',
    followUps: [
      { id: 'topic', label: 'What would you like to clarify?', placeholder: 'e.g. Interview format, panel size, dress code, etc.', required: true },
      { id: 'urgency', label: 'How urgent is this?', placeholder: 'e.g. Today / Before interview / Not urgent', required: false },
    ],
  },
  {
    id: 'application_status',
    label: 'Question about my application status',
    description: 'Ask about where you are in the process.',
    followUps: [
      { id: 'context', label: 'Anything your BD should know?', placeholder: 'e.g. I already completed an assessment on Monday.', required: false },
    ],
  },
  {
    id: 'availability_update',
    label: 'Update my job search preferences',
    description: 'Share changes in role, location, or salary expectations.',
    followUps: [
      { id: 'changes', label: 'What has changed?', placeholder: 'e.g. Now open to remote roles only, prefer backend positions.', required: true },
    ],
  },
  {
    id: 'other',
    label: 'Something else',
    description: 'Share any other question or update.',
    followUps: [
      { id: 'details', label: 'Tell us more', placeholder: 'Describe your question or situation in a sentence or two.', required: true },
    ],
  },
];

export default function UserLeadHelp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { leadId: paramLeadId } = useParams();

  const [selectedLeadId, setSelectedLeadId] = useState(paramLeadId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [followupValues, setFollowupValues] = useState({});
  const [submittedTemplate, setSubmittedTemplate] = useState(false);
  const [freeformMode, setFreeformMode] = useState(false);
  const [freeformMessage, setFreeformMessage] = useState('');

  const listRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setLeadsLoading(true);
    api
      .get('/leads/user', { params: { range: 'all', limit: 100 } })
      .then((res) => {
        setLeads(Array.isArray(res.data.items) ? res.data.items : []);
      })
      .catch(() => {
        setLeads([]);
      })
      .finally(() => setLeadsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user || !selectedLeadId) return;
    setLoading(true);
    setError('');
    api
      .get(`/leads/${selectedLeadId}/messages`)
      .then((res) => {
        setLead(res.data.lead || null);
        const msgs = Array.isArray(res.data.messages) ? res.data.messages : [];
        setMessages(msgs);
        const hasBdReply = msgs.some(
          (m) => m.sender_role === 'bd' || (m.sender_id && m.sender_id !== user.id && m.sender_role !== 'bot'),
        );
        if (hasBdReply) {
          setFreeformMode(true);
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Could not load conversation.';
        setError(msg);
        setLead(null);
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [user, selectedLeadId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const bdName = useMemo(() => {
    if (!lead) return 'your BD';
    return 'your BD';
  }, [lead]);

  const displayName = useMemo(() => user?.name || user?.full_name || '', [user?.name, user?.full_name]);
  const userInitials = useMemo(() => {
    const n = displayName || '';
    return (
      n
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U'
    );
  }, [displayName]);

  if (!user) return null;

  if (!user.emailVerified) {
    return <div style={{ padding: 40 }}>Please verify your email to access Help.</div>;
  }

  if (!user.isActive) {
    return (
      <div style={{ padding: 40 }}>
        No active subscription. Please choose a plan on the home page.
      </div>
    );
  }

  const resetTemplateState = () => {
    setSelectedTemplateId('');
    setFollowupValues({});
    setSubmittedTemplate(false);
    setFreeformMode(false);
  };

  const handleSelectTemplate = (id) => {
    setSelectedTemplateId(id);
    setFollowupValues({});
    setSubmittedTemplate(false);
  };

  const handleFollowupChange = (id, value) => {
    setFollowupValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmitTemplate = async (e) => {
    e.preventDefault();
    if (!selectedLeadId || !selectedTemplateId || sending) return;

    const template = QUICK_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    // Basic required-field validation
    for (const f of template.followUps) {
      if (f.required && !String(followupValues[f.id] || '').trim()) {
        setError(`Please fill in "${f.label}".`);
        return;
      }
    }

    setError('');
    setSending(true);
    const now = new Date().toISOString();

    const lines = [];
    lines.push(`Quick request: ${template.label}`);
    template.followUps.forEach((f) => {
      const val = String(followupValues[f.id] || '').trim();
      if (val) {
        lines.push(`${f.label}: ${val}`);
      }
    });
    const composed = lines.join('\n');

    try {
      const optimistic = {
        id: `temp-${Date.now()}`,
        job_assignment_id: selectedLeadId,
        sender_id: user.id,
        sender_role: user.role || 'user',
        message: composed,
        created_at: now,
        full_name: user.name || user.full_name || '',
        email: user.email,
        _optimistic: true,
      };

      setMessages((prev) => [...prev, optimistic]);
      const res = await api.post(`/leads/${selectedLeadId}/messages`, { message: composed });
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? res.data : m)),
      );
      setSubmittedTemplate(true);
      setFreeformMode(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send your request.';
      setError(msg);
      setMessages((prev) => prev.filter((m) => !m._optimistic));
    } finally {
      setSending(false);
    }
  };

  const handleFreeformSend = async (e) => {
    e.preventDefault();
    if (!selectedLeadId || !freeformMessage.trim() || sending) return;
    setSending(true);
    const now = new Date().toISOString();
    try {
      const optimistic = {
        id: `temp-freeform-${Date.now()}`,
        job_assignment_id: selectedLeadId,
        sender_id: user.id,
        sender_role: user.role || 'user',
        message: freeformMessage.trim(),
        created_at: now,
        full_name: user.name || user.full_name || '',
        email: user.email,
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      const toSend = freeformMessage.trim();
      setFreeformMessage('');
      const res = await api.post(`/leads/${selectedLeadId}/messages`, { message: toSend });
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? res.data : m)),
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send message.';
      setError(msg);
      setMessages((prev) => prev.filter((m) => !m._optimistic));
    } finally {
      setSending(false);
    }
  };

  const handleSelectLead = (leadId) => {
    setSelectedLeadId(leadId);
  };

  const headerTitle = lead
    ? `${lead.job_title || 'Job'} at ${lead.company_name || '—'}`
    : 'Help with your leads';

  const headerSubtitle = lead
    ? 'Choose a quick question to send structured details to your BD, or use freeform chat below.'
    : 'Pick a lead, then send a quick request or a freeform message — your BD will see it in their portal.';

  return (
    <DashboardLayout userName={displayName} userInitials={userInitials}>
      <div style={{ ...styles.layout, minHeight: '100%' }}>
        <main style={styles.main}>
        <header className="user-lead-help-top-header" style={styles.header}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} />
            <span className="user-lead-help-back-label">Back to dashboard</span>
          </button>
          <div style={styles.headerRight}>
            <div style={styles.headerIcon}>
              <MessageCircle size={18} />
            </div>
          </div>
        </header>

        <div className="user-lead-help-content" style={styles.content}>
          <div className="user-lead-help-heading" style={styles.headingRow}>
            <div className="user-lead-help-title-block">
              <h1 className="user-lead-help-title" style={styles.title}>{headerTitle}</h1>
              <p style={styles.subtitle}>{headerSubtitle}</p>
            </div>
            <div className="user-lead-help-badge" style={styles.badge}>
              Help &amp; BD chat
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <div className="user-lead-help-columns" style={styles.layoutTwoColumn}>
            <div style={styles.leadsColumn}>
              <h2 style={styles.sectionTitle}>Your leads</h2>
              {leadsLoading ? (
                <p style={{ color: theme.textMuted, fontSize: 14 }}>Loading leads…</p>
              ) : leads.length === 0 ? (
                <p style={{ color: theme.textMuted, fontSize: 14 }}>
                  No leads yet. Once your BD assigns leads to you, you can select them here to ask questions or request rescheduling.
                </p>
              ) : (
                <div className="user-lead-help-leads-list" style={styles.leadsList}>
                  {leads.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => handleSelectLead(l.id)}
                      style={{
                        ...styles.leadItem,
                        ...(selectedLeadId === l.id ? styles.leadItemActive : {}),
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                        {l.job_title || 'Untitled role'}
                      </div>
                      <div style={{ fontSize: 12, color: theme.textMuted }}>
                        {l.company_name || '—'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="user-lead-help-chat-column" style={styles.chatColumn}>
              {!selectedLeadId ? (
                <div className="user-lead-help-chat-card" style={styles.chatCard}>
                  <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
                    Select a lead from the list first. You can send a quick request or message your BD directly about that opportunity.
                  </p>
                </div>
              ) : loading ? (
                <div className="user-lead-help-chat-card" style={styles.chatCard}>
                  <div style={{ padding: 24, color: theme.textMuted }}>Loading conversation…</div>
                </div>
              ) : freeformMode ? (
                <div className="user-lead-help-chat-card" style={styles.chatCard}>
                  <div className="user-lead-help-freeform-header" style={styles.freeformHeader}>
                    <button type="button" onClick={resetTemplateState} style={styles.backToQuickBtn}>
                      ← Back to quick questions
                    </button>
                    <span className="user-lead-help-freeform-hint" style={styles.freeformHint}>
                      You can now chat freely about this opportunity. Your BD will see these messages.
                    </span>
                  </div>

                  <div
                    ref={listRef}
                    style={styles.messagesList}
                  >
                    {messages.length > 0 &&
                      messages.map((m) => {
                        const isBot = m.sender_role === 'bot';
                        const isMe = m.sender_id === user.id || m.sender_role === 'user';
                        const label = isBot ? 'HiredLogics Assistant' : isMe ? 'You' : 'BD';
                        return (
                          <div
                            key={m.id}
                            style={{
                              display: 'flex',
                              justifyContent: isMe ? 'flex-end' : 'flex-start',
                              marginBottom: 10,
                            }}
                          >
                            <div
                              style={{
                                maxWidth: '70%',
                                background: isMe ? theme.primary : isBot ? '#EFF6FF' : theme.cardBg,
                                color: isMe ? '#fff' : theme.text,
                                borderRadius: 16,
                                padding: '10px 14px',
                                border: isMe || isBot ? 'none' : `1px solid ${theme.border}`,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  opacity: 0.85,
                                  marginBottom: 4,
                                }}
                              >
                                {label}
                              </div>
                              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.message}</div>
                              <div
                                style={{
                                  fontSize: 11,
                                  opacity: 0.7,
                                  marginTop: 4,
                                  textAlign: 'right',
                                }}
                              >
                                {m.created_at
                                  ? new Date(m.created_at).toLocaleString()
                                  : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {messages.length === 0 && (
                      <p style={{ color: theme.textMuted, fontSize: 12, margin: 0, marginTop: 6 }}>
                        No messages yet.
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleFreeformSend} style={styles.inputRow}>
                    <textarea
                      value={freeformMessage}
                      onChange={(e) => setFreeformMessage(e.target.value)}
                      placeholder="Type a message to your BD…"
                      rows={3}
                      style={styles.textarea}
                    />
                    <button
                      type="submit"
                      disabled={sending || !freeformMessage.trim()}
                      style={{
                        ...styles.sendBtn,
                        opacity: sending || !freeformMessage.trim() ? 0.7 : 1,
                        cursor: sending || !freeformMessage.trim() ? 'default' : 'pointer',
                      }}
                    >
                      <Send size={16} />
                      <span>{sending ? 'Sending…' : 'Send'}</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="user-lead-help-chat-card" style={styles.chatCard}>
                  <div
                    className="user-lead-help-quick-section"
                    style={{
                      ...styles.quickSection,
                      maxHeight: '100%',
                    }}
                  >
                    {!selectedTemplateId ? (
                      <>
                        <h3 style={styles.quickTitle}>Quick questions</h3>
                        <p style={styles.quickSubtitle}>
                          Choose one of the options. Our AI assistant will ask a few follow-up questions and send everything to your BD.
                        </p>
                        <div className="user-lead-help-quick-list" style={styles.quickList}>
                          {QUICK_TEMPLATES.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleSelectTemplate(t.id)}
                              style={styles.quickItem}
                            >
                              <span style={{ fontWeight: 700 }}>{t.label}</span>
                              <span style={{ fontSize: 12, color: theme.textMuted }}>{t.description}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={styles.followupHeader}>
                          <button type="button" onClick={resetTemplateState} style={styles.backToQuickBtn}>
                            ← Back
                          </button>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 800, color: theme.text, lineHeight: 1.2 }}>
                              {QUICK_TEMPLATES.find((t) => t.id === selectedTemplateId)?.label || 'Follow-up questions'}
                            </div>
                            <div style={{ fontSize: 12, color: theme.textMuted }}>
                              Answer a few quick questions and we’ll send it to your BD.
                            </div>
                          </div>
                        </div>

                        <form onSubmit={handleSubmitTemplate} style={styles.quickForm}>
                          {QUICK_TEMPLATES.find((t) => t.id === selectedTemplateId)?.followUps.map((f) => (
                            <div key={f.id} style={{ marginBottom: 10 }}>
                              <label style={styles.quickLabel}>
                                {f.label}
                                {f.required && <span style={{ color: '#b91c1c' }}> *</span>}
                              </label>
                              <textarea
                                value={followupValues[f.id] || ''}
                                onChange={(e) => handleFollowupChange(f.id, e.target.value)}
                                placeholder={f.placeholder}
                                rows={3}
                                style={styles.textarea}
                              />
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                            <button
                              type="submit"
                              disabled={sending}
                              style={styles.sendBtn}
                            >
                              <Send size={16} />
                              <span>{sending ? 'Sending…' : 'Send to AI assistant'}</span>
                            </button>
                          </div>
                          {submittedTemplate && (
                            <p style={{ marginTop: 8, fontSize: 12, color: theme.textMuted }}>
                              Your response has been captured. You can go back to quick questions to send another request.
                            </p>
                          )}
                        </form>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </main>
      </div>
    </DashboardLayout>
  );
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
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 999,
    background: 'rgba(16,185,129,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.primary,
  },
  content: {
    padding: '28px 32px 40px',
    maxWidth: '100%',
    width: '100%',
  },
  headingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: theme.text,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 0,
    fontSize: 14,
    color: theme.textMuted,
  },
  badge: {
    padding: '6px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.primary}`,
    background: 'rgba(16,185,129,0.06)',
    color: theme.primary,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  layoutTwoColumn: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)',
    gap: 20,
    alignItems: 'stretch',
  },
  leadsColumn: {
    background: theme.cardBg,
    borderRadius: 16,
    border: `1px solid ${theme.border}`,
    padding: 14,
  },
  chatColumn: {
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: theme.text,
    margin: '0 0 8px',
  },
  leadsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 'calc(100vh - 260px)',
    overflowY: 'auto',
  },
  leadItem: {
    width: '100%',
    textAlign: 'left',
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: '8px 10px',
    background: theme.cardBg,
    cursor: 'pointer',
  },
  leadItemActive: {
    borderColor: theme.primary,
    background: 'rgba(16,185,129,0.06)',
  },
  errorBox: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(248,113,113,0.4)',
    background: 'rgba(254,242,242,0.9)',
    color: '#b91c1c',
    fontSize: 13,
    marginBottom: 12,
  },
  chatCard: {
    background: theme.cardBg,
    borderRadius: 18,
    border: `1px solid ${theme.border}`,
    padding: 18,
    boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 240px)',
    minHeight: 420,
    overflow: 'hidden',
  },
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 4,
    paddingTop: 12,
  },
  quickSection: {
    borderBottom: `1px solid ${theme.border}`,
    paddingBottom: 12,
    overflowY: 'auto',
    maxHeight: '45%',
    minHeight: 180,
  },
  quickTitle: {
    margin: '0 0 6px',
    fontSize: 14,
    fontWeight: 700,
    color: theme.text,
  },
  quickSubtitle: {
    margin: '0 0 10px',
    fontSize: 13,
    color: theme.textMuted,
  },
  quickList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
    marginBottom: 12,
  },
  quickItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    width: '100%',
    textAlign: 'left',
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: '10px 12px',
    background: theme.cardBg,
    cursor: 'pointer',
  },
  quickForm: {
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 12,
    background: 'rgba(241,245,249,0.6)',
  },
  quickLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: theme.text,
    marginBottom: 6,
  },
  clearBtn: {
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  followupHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  backToQuickBtn: {
    flexShrink: 0,
    padding: '8px 12px',
    borderRadius: 999,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  freeformHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottom: `1px solid ${theme.border}`,
  },
  freeformHint: {
    fontSize: 13,
    color: theme.textMuted,
  },
  inputRow: {
    borderTop: `1px solid ${theme.border}`,
    paddingTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  textarea: {
    width: '100%',
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: '10px 12px',
    fontSize: 14,
    resize: 'vertical',
    minHeight: 60,
    maxHeight: 160,
  },
  sendBtn: {
    alignSelf: 'flex-end',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 999,
    border: 'none',
    background: theme.primary,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
  },
};

