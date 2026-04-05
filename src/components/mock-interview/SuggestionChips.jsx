import React from 'react';

const DEFAULT_SUGGESTIONS = [
  "I'd like to share a concrete example from my experience.",
  'Could you clarify or rephrase that question?',
  "I'd like to expand on my previous answer.",
];

export default function SuggestionChips({ suggestions = DEFAULT_SUGGESTIONS, onPick, visible }) {
  if (!visible) return null;
  const list = suggestions.length ? suggestions : DEFAULT_SUGGESTIONS;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
        marginBottom: 16,
        maxWidth: 780,
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: 50,
      }}
    >
      {list.slice(0, 3).map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => onPick?.(text)}
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 9999,
            padding: '8px 14px',
            fontSize: 13,
            color: '#374151',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 0.15s, color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2563eb';
            e.currentTarget.style.color = '#2563eb';
            e.currentTarget.style.background = '#eff6ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.color = '#374151';
            e.currentTarget.style.background = 'white';
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
