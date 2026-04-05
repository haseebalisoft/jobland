import React from 'react';

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function UserMessage({ content, createdAt }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>You</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(createdAt)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            background: '#2563eb',
            borderRadius: '18px 4px 18px 18px',
            padding: '14px 18px',
            maxWidth: '70%',
            color: 'white',
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{content}</p>
        </div>
      </div>
    </div>
  );
}
