import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../BdDashboard.css';

const theme = { primary: '#10B981', text: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', cardBg: '#ffffff' };

export default function BdLeadHelp() {
  const { user } = useAuth();

  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [lead, setLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState('');

  const listRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setLeadsLoading(true);
    api
      .get('/leads/bd', { params: { range: 'all', limit: 200 } })
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
    setLoadingConversation(true);
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
      .finally(() => setLoadingConversation(false));
  }, [user, selectedLeadId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const handleSelectLead = (id) => {
    setSelectedLeadId(id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedLeadId || sending) return;
    setSending(true);
    try {
      const optimistic = {
        id: `temp-${Date.now()}`,
        job_assignment_id: selectedLeadId,
        sender_id: user.id,
        sender_role: user.role || 'bd',
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

  const bdLabel = useMemo(() => {
    if (!lead) return 'user';
    return 'user';
  }, [lead]);

  const headerTitle = lead
    ? `${lead.job_title || 'Job'} at ${lead.company_name || '—'}`
    : 'User help & messages';

  const headerSubtitle = lead
    ? 'Reply to the user about this opportunity, clarify interview details, or coordinate rescheduling.'
    : 'Select a lead to read and reply to messages from users about that specific opportunity.';

  return (
    <div className="bd-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: theme.text, marginBottom: 4 }}>{headerTitle}</h1>
          <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>{headerSubtitle}</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, border: `1px solid ${theme.border}`, background: theme.cardBg, fontSize: 12, color: theme.textMuted }}>
          <MessageCircle size={16} />
          BD ↔ User help
        </div>
      </div>

      {error && (
        <div style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.4)', background: 'rgba(254,242,242,0.9)', color: '#b91c1c', fontSize: 13, marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 260px) minmax(0, 1fr)', gap: 18, alignItems: 'stretch' }}>
        <div style={{ background: theme.cardBg, borderRadius: 16, border: `1px solid ${theme.border}`, padding: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: theme.text, margin: '0 0 8px' }}>Leads with users</h2>
          {leadsLoading ? (
            <p style={{ color: theme.textMuted, fontSize: 14 }}>Loading leads…</p>
          ) : leads.length === 0 ? (
            <p style={{ color: theme.textMuted, fontSize: 14 }}>
              No leads yet. Once you create and assign leads to users, you will see them here and can reply to their questions.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
              {leads.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleSelectLead(l.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    borderRadius: 10,
                    border: `1px solid ${selectedLeadId === l.id ? theme.primary : theme.border}`,
                    padding: '8px 10px',
                    background: selectedLeadId === l.id ? 'rgba(16,185,129,0.06)' : theme.cardBg,
                    cursor: 'pointer',
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

        <div style={{ minWidth: 0 }}>
          {!selectedLeadId ? (
            <div style={{ background: theme.cardBg, borderRadius: 18, border: `1px solid ${theme.border}`, padding: 18, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', minHeight: 260 }}>
              <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
                Select a lead on the left to see that user’s messages and reply to them.
              </p>
            </div>
          ) : (
            <div style={{ background: theme.cardBg, borderRadius: 18, border: `1px solid ${theme.border}`, padding: 18, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', flexDirection: 'column', minHeight: 260, maxHeight: 'calc(100vh - 260px)' }}>
              {loadingConversation ? (
                <div style={{ padding: 24, color: theme.textMuted }}>Loading conversation…</div>
              ) : (
                <>
                  <div ref={listRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 12 }}>
                    {messages.length === 0 ? (
                      <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
                        No messages yet. Once the user sends a message from their Help tab, you’ll see it here and can reply.
                      </p>
                    ) : (
                      messages.map((m) => {
                        const isMe = m.sender_id === user.id || m.sender_role === 'bd';
                        const label = isMe ? 'You' : bdLabel;
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
                                {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSend} style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Reply to the user (e.g. confirm rescheduled time, share link updates, or ask clarifying questions)…"
                      rows={3}
                      style={{ width: '100%', borderRadius: 12, border: `1px solid ${theme.border}`, padding: '10px 12px', fontSize: 14, resize: 'vertical', minHeight: 60, maxHeight: 160 }}
                    />
                    <button
                      type="submit"
                      disabled={sending || !message.trim()}
                      style={{
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
                        opacity: sending || !message.trim() ? 0.7 : 1,
                        cursor: sending || !message.trim() ? 'default' : 'pointer',
                      }}
                    >
                      <Send size={16} />
                      <span>{sending ? 'Sending…' : 'Send'}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

