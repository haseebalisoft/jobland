import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import UserSidebar from '../components/UserSidebar.jsx';
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

export default function UserLeadHelp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { leadId: paramLeadId } = useParams();

  const [selectedLeadId, setSelectedLeadId] = useState(paramLeadId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

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
        setMessages(Array.isArray(res.data.messages) ? res.data.messages : []);
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    if (!selectedLeadId) return;
    setSending(true);
    try {
      const optimistic = {
        id: `temp-${Date.now()}`,
        job_assignment_id: selectedLeadId,
        sender_id: user.id,
        sender_role: user.role || 'user',
        message: message.trim(),
        created_at: new Date().toISOString(),
        full_name: user.name || user.full_name || '',
        email: user.email,
        _optimistic: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      const toSend = message.trim();
      setMessage('');
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
    ? 'Use this space to ask your BD about this opportunity, interview details, or rescheduling.'
    : 'Choose a lead below to start a conversation with your BD about that opportunity.';

  return (
    <div className="dashboard-layout" style={styles.layout}>
      <UserSidebar />
      <main style={styles.main}>
        <header style={styles.header}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={styles.backBtn}
          >
            <ArrowLeft size={18} />
            <span>Back to dashboard</span>
          </button>
          <div style={styles.headerRight}>
            <div style={styles.headerIcon}>
              <MessageCircle size={18} />
            </div>
          </div>
        </header>

        <div style={styles.content}>
          <div style={styles.headingRow}>
            <div>
              <h1 style={styles.title}>{headerTitle}</h1>
              <p style={styles.subtitle}>{headerSubtitle}</p>
            </div>
            <div style={styles.badge}>
              Help &amp; BD chat
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <div style={styles.layoutTwoColumn}>
            <div style={styles.leadsColumn}>
              <h2 style={styles.sectionTitle}>Your leads</h2>
              {leadsLoading ? (
                <p style={{ color: theme.textMuted, fontSize: 14 }}>Loading leads…</p>
              ) : leads.length === 0 ? (
                <p style={{ color: theme.textMuted, fontSize: 14 }}>
                  No leads yet. Once your BD assigns leads to you, you can select them here to ask questions or request rescheduling.
                </p>
              ) : (
                <div style={styles.leadsList}>
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

            <div style={styles.chatColumn}>
              {!selectedLeadId ? (
                <div style={styles.chatCard}>
                  <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
                    Select a lead on the left to start a conversation with your BD about that opportunity.
                  </p>
                </div>
              ) : loading ? (
                <div style={styles.chatCard}>
                  <div style={{ padding: 24, color: theme.textMuted }}>Loading conversation…</div>
                </div>
              ) : (
                <div style={styles.chatCard}>
                  <div ref={listRef} style={styles.messagesList}>
                    {messages.length === 0 ? (
                      <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
                        This is a private space between you and {bdName}. Ask questions, share updates,
                        or request an interview reschedule.
                      </p>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.sender_id === user.id || m.sender_role === 'user';
                        const label =
                          isMe ? 'You' : 'BD';
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
                                background: isMe ? theme.primary : theme.cardBg,
                                color: isMe ? '#fff' : theme.text,
                                borderRadius: 16,
                                padding: '10px 14px',
                                border: isMe ? 'none' : `1px solid ${theme.border}`,
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
                      })
                    )}
                  </div>

                  <form onSubmit={handleSend} style={styles.inputRow}>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write a message to your BD (e.g. ask to reschedule an interview, share availability, or clarify details)…"
                      rows={3}
                      style={styles.textarea}
                    />
                    <button
                      type="submit"
                      disabled={sending || !message.trim()}
                      style={{
                        ...styles.sendBtn,
                        opacity: sending || !message.trim() ? 0.7 : 1,
                        cursor: sending || !message.trim() ? 'default' : 'pointer',
                      }}
                    >
                      <Send size={16} />
                      <span>{sending ? 'Sending…' : 'Send'}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
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
    maxWidth: 960,
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
    gridTemplateColumns: 'minmax(0, 260px) minmax(0, 1fr)',
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
    maxHeight: 360,
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
    minHeight: 320,
    maxHeight: 'calc(100vh - 220px)',
  },
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: 4,
    marginBottom: 12,
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

