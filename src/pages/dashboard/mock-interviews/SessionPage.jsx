import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import api from '../../../services/api.js';
import { streamInterviewMessage } from '../../../hooks/useAIChat.js';
import '../../../components/mock-interviews/mockInterviews.css';

function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [scenario, setScenario] = useState(location.state?.scenario || null);
  const [messages, setMessages] = useState(() => {
    const fm = location.state?.firstMessage;
    if (fm) return [{ role: 'assistant', content: fm }];
    return [];
  });

  useEffect(() => {
    if (location.state?.firstMessage) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/mock-interviews/sessions/${sessionId}`);
        if (cancelled) return;
        if (data.scenario) setScenario(data.scenario);
        const conv = data.conversation || [];
        if (conv.length) {
          setMessages(
            conv
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({ role: m.role, content: m.content })),
          );
        }
      } catch {
        navigate('/dashboard/mock-interviews');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, location.state?.firstMessage, navigate]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef(null);

  const initials =
    String(user?.name || '')
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  const userLetter = initials.slice(0, 1);

  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, typing]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setTyping(true);
    setStreamingText('');
    try {
      await streamInterviewMessage(sessionId, text, {
        onChunk: (c) => setStreamingText((prev) => prev + c),
        onDone: (meta) => {
          setTyping(false);
          setStreamingText('');
          if (meta?.reply) {
            setMessages((m) => [...m, { role: 'assistant', content: meta.reply }]);
          }
        },
        onError: (err) => {
          setTyping(false);
          setStreamingText('');
          window.alert(err);
        },
      });
    } catch (e) {
      setTyping(false);
      window.alert(e.message || 'Send failed');
    }
  };

  const end = async () => {
    if (!window.confirm('End this interview and generate your report?')) return;
    try {
      await api.put(`/mock-interviews/sessions/${sessionId}/end`);
      await api.post(`/mock-interviews/sessions/${sessionId}/generate-report`);
      navigate(`/dashboard/mock-interviews/session/${sessionId}/report`);
    } catch (e) {
      window.alert(e.response?.data?.message || e.message);
    }
  };

  const startSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      window.alert('Speech recognition is not supported in this browser.');
      return;
    }
    const r = new SR();
    r.lang = 'en-US';
    r.onresult = (ev) => {
      const t = ev.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${t}` : t));
    };
    r.start();
  };

  const focusList = Array.isArray(scenario?.focus_areas) ? scenario.focus_areas : [];

  return (
    <DashboardLayout userName={user?.name || ''} userInitials={initials}>
      <div className="mi-session">
        <div className="mi-chat">
          <div className="mi-chat__head">
            <strong>{scenario?.title || 'Mock interview'}</strong>
            <span style={{ fontFamily: 'monospace', color: '#6b7280' }}>{formatElapsed(elapsed)}</span>
          </div>
          <div className="mi-chat__messages">
            {messages.map((msg, i) => (
              <div key={i} className="mi-row" style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'assistant' && (
                  <div className="mi-avatar mi-avatar--ai" aria-hidden>
                    AI
                  </div>
                )}
                <div className={`mi-bubble mi-bubble--${msg.role === 'user' ? 'user' : 'ai'}`}>{msg.content}</div>
                {msg.role === 'user' && (
                  <div className="mi-avatar mi-avatar--user" aria-hidden>
                    {userLetter}
                  </div>
                )}
              </div>
            ))}
            {typing && streamingText && (
              <div className="mi-row">
                <div className="mi-avatar mi-avatar--ai">AI</div>
                <div className="mi-bubble mi-bubble--ai">{streamingText}</div>
              </div>
            )}
            {typing && !streamingText && (
              <div className="mi-bubble mi-bubble--ai mi-typing">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="mi-compose">
            <div className="mi-compose__row">
              <input
                type="text"
                placeholder="Type your answer..."
                value={input}
                maxLength={8000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button type="button" onClick={startSpeech} title="Voice input">
                Mic
              </button>
              <button type="button" onClick={send}>
                Send
              </button>
            </div>
            <span className="mi-compose__meta">{input.length} / 8000</span>
          </div>
        </div>

        <aside className="mi-side">
          <span className="mi-badge">{scenario?.category || 'Interview'}</span>
          <h3>{scenario?.title || 'Session'}</h3>
          {focusList.length > 0 && (
            <>
              <strong>Key areas to focus on</strong>
              <ul>
                {focusList.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          )}
          <strong>Your context</strong>
          <p style={{ fontSize: 13, color: '#4b5563' }}>
            {user?.name || '—'} · {scenario?.title ? 'Review setup on previous page' : ''}
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            Question {messages.filter((m) => m.role === 'assistant').length} · keep answers concise
          </p>
          <button type="button" className="mi-danger" onClick={end}>
            End Interview
          </button>
        </aside>
      </div>
    </DashboardLayout>
  );
}
