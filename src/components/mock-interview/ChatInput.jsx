import React, { useEffect, useRef } from 'react';
import { Mic, Send } from 'lucide-react';
import './interviewChat.css';

export default function ChatInput({
  value,
  onChange,
  onSend,
  onMicClick,
  isRecording,
  micSupported,
  micMuted,
  disabled,
  maxLength = 8000,
}) {
  const taRef = useRef(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(Math.max(el.scrollHeight, 52), 150);
    el.style.height = `${next}px`;
  }, [value]);

  const sendDisabled = disabled || !String(value || '').trim();

  return (
    <div
      style={{
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '16px 20px',
        flexShrink: 0,
      }}
    >
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            maxLength={maxLength}
            placeholder="Type your answer here..."
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendDisabled) onSend();
              }
            }}
            style={{
              flex: 1,
              border: '1.5px solid #e5e7eb',
              borderRadius: 16,
              padding: '12px 16px',
              fontSize: 15,
              minHeight: 52,
              maxHeight: 150,
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.45,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2563eb';
              e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="button"
            title={micMuted ? 'Unmute voice input' : 'Voice input'}
            disabled={!micSupported || micMuted}
            onClick={onMicClick}
            className={isRecording ? 'ic-recording-pulse' : ''}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: isRecording ? '1.5px solid #fca5a5' : '1.5px solid #e5e7eb',
              background: isRecording ? '#fee2e2' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: !micSupported || micMuted ? 'not-allowed' : 'pointer',
              opacity: !micSupported || micMuted ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            <Mic size={20} color={isRecording ? '#dc2626' : '#6b7280'} strokeWidth={2} />
          </button>
          <button
            type="button"
            title="Send"
            disabled={sendDisabled}
            onClick={onSend}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: sendDisabled ? '#e5e7eb' : '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: sendDisabled ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'transform 0.15s, background 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!sendDisabled) e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Send size={18} color={sendDisabled ? '#9ca3af' : 'white'} strokeWidth={2} />
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, color: '#9ca3af', fontStyle: 'italic', margin: '10px 0 0' }}>
          Hirdlogic AI can make mistakes. This is practice only.
        </p>
      </div>
    </div>
  );
}
