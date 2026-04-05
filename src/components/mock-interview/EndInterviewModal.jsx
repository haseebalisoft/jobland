import React from 'react';

export default function EndInterviewModal({ open, onContinue, onEndAndReport, busy }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ic-end-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10020,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 28,
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <h2 id="ic-end-title" style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#111827' }}>
          End this interview?
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
          Are you sure you want to end the interview? Your session will be saved and a report generated.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={busy}
            onClick={onContinue}
            style={{
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: '#374151',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: 10,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            Continue Interview
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onEndAndReport}
            style={{
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              background: busy ? '#fca5a5' : '#dc2626',
              border: 'none',
              borderRadius: 10,
              cursor: busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Please wait…' : 'End & Get Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
