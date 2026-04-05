import React from 'react';

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function AIMessage({ content, createdAt }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, paddingLeft: 50 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#2563eb' }}>Hirdlogic AI Interviewer</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(createdAt)}</span>
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
          aria-hidden
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
