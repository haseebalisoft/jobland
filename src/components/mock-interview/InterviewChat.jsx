import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api.js';
import { useInterviewChat } from '../../hooks/useInterviewChat.js';
import { useVoiceInput } from '../../hooks/useVoiceInput.js';
import InterviewTopBar from './InterviewTopBar.jsx';
import AIMessage from './AIMessage.jsx';
import UserMessage from './UserMessage.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import SuggestionChips from './SuggestionChips.jsx';
import ChatInput from './ChatInput.jsx';
import EndInterviewModal from './EndInterviewModal.jsx';
import InterviewSidePanel from './InterviewSidePanel.jsx';
import './interviewChat.css';

function StreamingAIMessage({ content }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, paddingLeft: 50 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#2563eb' }}>Hirdlogic AI Interviewer</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>…</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: 'white',
            fontWeight: 700,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          AI
        </div>
        <div
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '4px 18px 18px 18px',
            padding: '16px 20px',
            maxWidth: '75%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: '#111827', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content}</p>
        </div>
      </div>
    </div>
  );
}

export default function InterviewChat({ sessionId, initialScenario, initialMessages, navigate }) {
  const [scenario, setScenario] = useState(initialScenario || null);
  const [elapsed, setElapsed] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [endModalOpen, setEndModalOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [input, setInput] = useState('');
  const [notes, setNotes] = useState('');
  const [checkedFocus, setCheckedFocus] = useState({});
  const bottomRef = useRef(null);

  const { messages, setMessages, streamingText, isTyping, error, setError, sendMessage } = useInterviewChat({
    sessionId,
    initialMessages: initialMessages || [],
  });

  const focusList = Array.isArray(scenario?.focus_areas) ? scenario.focus_areas : [];

  useEffect(() => {
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
              .map((m, i) => ({
                role: m.role,
                content: m.content,
                id: `srv-${sessionId}-${i}-${m.role}`,
                createdAt: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
              })),
          );
        }
      } catch {
        navigate('/dashboard/mock-interviews');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, navigate, setMessages]);

  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isTyping]);

  const onAppendVoice = useCallback((text) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  const { isRecording, supported: voiceSupported, toggle: toggleVoice } = useVoiceInput({
    onAppend: onAppendVoice,
  });

  const assistantTurns = messages.filter((m) => m.role === 'assistant').length;
  const questionNum = assistantTurns + (isTyping ? 1 : 0);
  const questionLabel = `Question ${Math.min(questionNum, 8)} of ~8`;

  const showSuggestions = useMemo(() => {
    if (isTyping) return false;
    const last = messages[messages.length - 1];
    return last?.role === 'assistant' && last?.content;
  }, [messages, isTyping]);

  const toggleFocus = useCallback((f) => {
    setCheckedFocus((prev) => ({ ...prev, [f]: !prev[f] }));
  }, []);

  const handleSend = useCallback(async () => {
    const t = input.trim();
    if (!t || isTyping) return;
    setInput('');
    await sendMessage(t);
  }, [input, isTyping, sendMessage]);

  const openEndModal = useCallback(() => setEndModalOpen(true), []);

  const finishInterview = useCallback(async () => {
    setEnding(true);
    try {
      await api.put(`/mock-interviews/sessions/${sessionId}/end`);
      await api.post(`/mock-interviews/sessions/${sessionId}/generate-report`);
      navigate(`/dashboard/mock-interviews/session/${sessionId}/report`);
    } catch (e) {
      window.alert(e.response?.data?.message || e.message || 'Could not complete');
    } finally {
      setEnding(false);
      setEndModalOpen(false);
    }
  }, [sessionId, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      <InterviewTopBar
        scenarioTitle={scenario?.title}
        onEndClick={openEndModal}
        elapsedSec={elapsed}
        questionLabel={questionLabel}
        voiceMuted={voiceMuted}
        onToggleVoiceMute={() => setVoiceMuted((m) => !m)}
        onSettingsClick={() => setPanelOpen((p) => !p)}
      />

      {error ? (
        <div style={{ padding: 12, textAlign: 'center', color: '#b91c1c', fontSize: 14 }}>
          {error}{' '}
          <button type="button" style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '24px 20px 120px' }}>
            {messages.map((msg) =>
              msg.role === 'assistant' ? (
                <AIMessage key={msg.id} content={msg.content} createdAt={msg.createdAt} />
              ) : (
                <UserMessage key={msg.id} content={msg.content} createdAt={msg.createdAt} />
              ),
            )}
            {isTyping && streamingText ? <StreamingAIMessage content={streamingText} /> : null}
            {isTyping && !streamingText ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingLeft: 50 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  AI
                </div>
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px 18px 18px 18px',
                    padding: '12px 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <TypingIndicator />
                </div>
              </div>
            ) : null}
            <SuggestionChips visible={showSuggestions} onPick={(text) => setInput(text)} />
            <div ref={bottomRef} />
          </div>
        </main>

        <button
          type="button"
          onClick={() => setPanelOpen((p) => !p)}
          title={panelOpen ? 'Hide panel' : 'Session info'}
          style={{
            position: 'absolute',
            right: panelOpen ? 280 : 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 22,
            height: 56,
            border: '1px solid #e5e7eb',
            borderRight: panelOpen ? '1px solid #e5e7eb' : 'none',
            borderRadius: panelOpen ? '8px 0 0 8px' : '8px 0 0 8px',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
            boxShadow: panelOpen ? '-2px 0 8px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          {panelOpen ? <ChevronRight size={18} color="#64748b" /> : <ChevronLeft size={18} color="#64748b" />}
        </button>

        <div className="ic-side-panel-host">
          <InterviewSidePanel
            open={panelOpen}
            scenario={scenario}
            elapsedSec={elapsed}
            focusAreas={focusList}
            checkedFocus={checkedFocus}
            onToggleFocus={toggleFocus}
            notes={notes}
            onNotesChange={setNotes}
            onEndInterview={openEndModal}
          />
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onMicClick={voiceMuted ? undefined : toggleVoice}
          isRecording={isRecording}
          micSupported={voiceSupported}
          micMuted={voiceMuted}
          disabled={isTyping || ending}
        />
      </div>

      <EndInterviewModal
        open={endModalOpen}
        busy={ending}
        onContinue={() => setEndModalOpen(false)}
        onEndAndReport={finishInterview}
      />

      {ending ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10030,
            background: 'rgba(255,255,255,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid #e5e7eb',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>Generating your performance report…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : null}
    </div>
  );
}
