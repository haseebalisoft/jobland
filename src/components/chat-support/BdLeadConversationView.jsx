import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Smile } from 'lucide-react';
import api from '../../services/api.js';
import ChatMessage from './ChatMessage.jsx';
import './chat-support.css';

/**
 * User ↔ BD thread for one job lead (GET/POST /api/leads/:id/messages).
 */
export default function BdLeadConversationView({
  leadId,
  jobTitle,
  companyName,
  userId,
  initialMessages = [],
  onBack,
  onRefreshUnread,
}) {
  const [messages, setMessages] = useState(() => initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    setMessages(Array.isArray(initialMessages) ? initialMessages : []);
  }, [leadId, initialMessages]);

  const toChatRole = (m) => {
    if (!m) return 'assistant';
    if (m.sender_id === userId || m.sender_role === 'user') return 'user';
    return 'assistant';
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !leadId) return;
    setInput('');
    setSending(true);
    const now = new Date().toISOString();
    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      sender_role: 'user',
      message: text,
      created_at: now,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const { data } = await api.post(`/leads/${leadId}/messages`, { message: text });
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? data : m)));
      onRefreshUnread?.();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      const msg = err.response?.data?.message || 'Could not send message.';
      window.alert(msg);
    } finally {
      setSending(false);
    }
  };

  const subtitle = [jobTitle, companyName].filter(Boolean).join(' · ') || 'Assigned opportunity';

  return (
    <div className="cs-conv">
      <header className="cs-conv__header">
        <button type="button" className="cs-conv__back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="cs-conv__header-mid">
          <div className="cs-conv__avatar-wrap">
            <div className="cs-msg__avatar cs-msg__avatar--logo cs-msg__avatar--sm">
              <img src="/logo.png" alt="" />
            </div>
          </div>
          <div>
            <div className="cs-conv__title">Your BD</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ width: 36 }} />
      </header>

      <div className="cs-conv__scroll">
        {messages.length === 0 && (
          <p style={{ padding: '16px 20px', margin: 0, fontSize: 14, color: '#64748b' }}>
            No messages yet. Say hello or ask a question about this role — your BD will see it in their portal.
          </p>
        )}
        {messages.map((m, i) => (
          <ChatMessage
            key={m.id || `${i}-${m.created_at}`}
            role={toChatRole(m)}
            content={m.message || ''}
            nameLabel={toChatRole(m) === 'user' ? undefined : 'Your BD'}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="cs-conv__input-wrap">
        <button type="button" className="cs-conv__emoji" aria-label="Emoji">
          <Smile size={20} />
        </button>
        <input
          className="cs-conv__input"
          placeholder="Message your BD…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={sending}
        />
        <button
          type="button"
          className="cs-conv__send"
          onClick={send}
          disabled={sending || !input.trim()}
          aria-label="Send"
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
