import React from 'react';
import './interviewChat.css';

export default function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 0' }}>
      <span className="ic-bounce-dot" />
      <span className="ic-bounce-dot" />
      <span className="ic-bounce-dot" />
    </div>
  );
}
