import { useState, useRef, useEffect } from 'react';
import { MoreVertical, RotateCcw, RotateCw, Send } from 'lucide-react';
import api from '../../services/api.js';

export default function AIAssistantTab({ profile, resumeId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [history, setHistory] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const pushUndo = () => {
    setHistory((h) => [...h, input]);
    setInput('');
  };

  const popRedo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setInput(prev);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    const userMsg = { role: 'user', content: text, t: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);

    try {
      let assistantText = '';
      const tryStream = async () => {
        const token = typeof window !== 'undefined' ? window.sessionStorage.getItem('hiredlogics_access_token') : null;
        const base = api.defaults.baseURL || '';
        const url = `${base}/resumes/${resumeId}/ai-assist`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            message: text,
            resumeContent: JSON.stringify(profile),
            conversationHistory: messages.slice(-10),
          }),
        });
        if (!res.ok) throw new Error('no_stream');
        const reader = res.body?.getReader();
        if (!reader) throw new Error('no_body');
        const dec = new TextDecoder();
        let buf = '';
        let full = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            for (const line of block.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const payload = line.replace(/^data:\s*/, '').trim();
              if (!payload) continue;
              try {
                const json = JSON.parse(payload);
                if (json.chunk) full += json.chunk;
                if (json.text) full += json.text;
              } catch {
                /* */
              }
            }
          }
        }
        return full;
      };

      try {
        assistantText = await tryStream();
      } catch {
        assistantText = '';
      }

      if (!assistantText) {
        const { data } = await api.post('/cv/improve-summary', {
          summary: `User message: ${text}\n\nContext (resume JSON excerpt):\n${JSON.stringify(profile).slice(0, 4000)}`,
          role: profile?.professional?.currentTitle || 'Professional',
        });
        assistantText = data?.improved || 'No response from AI. Try again.';
      }

      setMessages((m) => [...m, { role: 'assistant', content: assistantText, t: Date.now() }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: e?.response?.data?.error || e.message || 'Request failed.', t: Date.now() },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="re-ai-tab-root">
      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>AI Assistant</span>
          <span style={{ fontSize: 11, color: '#64748b', padding: '2px 8px', background: '#f1f5f9', borderRadius: 6 }}>Beta</span>
        </div>
        <button type="button" className="re-icon-btn" aria-label="Menu">
          <MoreVertical size={18} />
        </button>
      </div>
      <div className="re-ai-info">
        <p style={{ margin: '0 0 12px' }}>
          Let AI help you sharpen your resume. Ask it to rewrite bullets for clarity and impact, tailor content to a job description,
          adjust tone, or quantify results.
        </p>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13 }}>What you can do</p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55, fontSize: 14 }}>
          <li>Rewrite bullets to be concise, metric-driven, and action-oriented.</li>
          <li>Tailor your resume to a specific role or job description.</li>
          <li>Fix grammar, tone, and highlight measurable outcomes.</li>
        </ul>
        <p className="re-ai-tip" style={{ margin: '12px 0 0', fontStyle: 'italic', fontSize: 13 }}>
          Try: &quot;Rewrite this bullet to be concise and metrics-driven:&quot;
        </p>
      </div>
      <div className="re-ai-chat">
        {messages.map((m, i) => (
          <div key={i} className={`re-msg re-msg--${m.role === 'user' ? 'user' : 'ai'}`}>
            <div>{m.content}</div>
            <div style={{ fontSize: 10, opacity: 0.65, marginTop: 6 }}>{new Date(m.t).toLocaleTimeString()}</div>
          </div>
        ))}
        {typing && (
          <div className="re-msg re-msg--ai">
            <em>Thinking…</em>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="re-ai-input-wrap">
        <textarea
          className="re-textarea"
          placeholder="Tell us what you have in mind..."
          rows={Math.min(4, Math.max(2, Math.ceil(input.length / 80)))}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="re-ai-toolbar">
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="re-icon-btn" title="Undo" onClick={pushUndo}>
              <RotateCcw size={18} />
            </button>
            <button type="button" className="re-icon-btn" title="Redo" onClick={popRedo}>
              <RotateCw size={18} />
            </button>
          </div>
          <button type="button" className="re-btn-primary" style={{ height: 36 }} onClick={send} disabled={typing}>
            <Send size={18} />
          </button>
        </div>
      </div>
      <p className="re-ai-disclaimer">Hirdlogic AI assistant can make mistakes. Please verify responses.</p>
    </div>
  );
}
