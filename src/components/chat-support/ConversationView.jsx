import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Smile } from 'lucide-react';
import api from '../../services/api.js';
import { streamSupportMessage } from '../../hooks/useSupportChat.js';
import ChatMessage from './ChatMessage.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import './chat-support.css';

export default function ConversationView({ conversationId, initialMessages, onBack, onRefreshUnread }) {
  const [messages, setMessages] = useState(() =>
    (initialMessages || []).map((m) => ({
      role: m.role,
      content: m.content || '',
      timestamp: m.timestamp || m.createdAt,
    })),
  );
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, streamingText]);

  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      try {
        await api.patch(`/support-chat/conversations/${conversationId}/read`);
        onRefreshUnread?.();
      } catch {
        /* ignore */
      }
    })();
  }, [conversationId, onRefreshUnread]);

  useEffect(() => {
    setMessages(
      (initialMessages || []).map((m) => ({
        role: m.role,
        content: m.content || '',
        timestamp: m.timestamp || m.createdAt,
      })),
    );
  }, [conversationId, initialMessages]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing || !conversationId) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, timestamp: new Date().toISOString() },
    ]);
    setTyping(true);
    setStreamingText('');

    let acc = '';
    await streamSupportMessage({
      conversationId,
      message: text,
      onToken: (t) => {
        acc += t;
        setStreamingText(acc);
      },
      onDone: async () => {
        setTyping(false);
        setStreamingText('');
        try {
          const { data } = await api.get(`/support-chat/conversations/${conversationId}`);
          if (data?.messages?.length) {
            setMessages(
              data.messages.map((m) => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
              })),
            );
          }
        } catch {
          if (acc.trim()) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: acc.trim(), timestamp: new Date().toISOString() },
            ]);
          }
        }
        try {
          await api.patch(`/support-chat/conversations/${conversationId}/read`);
        } catch {
          /* ignore */
        }
        onRefreshUnread?.();
      },
      onError: () => {
        setTyping(false);
        setStreamingText('');
        onRefreshUnread?.();
      },
    });
  };

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
            <span className="cs-conv__online" title="Online" />
          </div>
          <div>
            <div className="cs-conv__title">Hirdlogic Support</div>
          </div>
        </div>
        <div style={{ width: 36 }} />
      </header>

      <div className="cs-conv__scroll">
        {messages.map((m, i) => (
          <ChatMessage key={`${m.role}-${i}-${String(m.timestamp)}`} role={m.role} content={m.content} />
        ))}
        {typing && streamingText && (
          <ChatMessage role="assistant" content={streamingText} />
        )}
        {typing && !streamingText && (
          <div className="cs-msg cs-msg--ai">
            <div className="cs-msg__ai-row">
              <div className="cs-msg__avatar cs-msg__avatar--logo">
                <img src="/logo.png" alt="" />
              </div>
              <div className="cs-msg__ai-text">
                <div className="cs-msg__name">Hirdlogic AI</div>
                <div className="cs-msg__bubble cs-msg__bubble--ai cs-msg__bubble--typing">
                  <TypingIndicator />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="cs-conv__input-wrap">
        <button type="button" className="cs-conv__emoji" aria-label="Emoji">
          <Smile size={20} />
        </button>
        <input
          className="cs-conv__input"
          placeholder="Write a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          disabled={typing}
        />
        <button type="button" className="cs-conv__send" onClick={send} disabled={typing || !input.trim()} aria-label="Send">
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
