import React from 'react';
import { ArrowLeft, Clock, Mic, MicOff, Settings } from 'lucide-react';

function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function InterviewTopBar({
  scenarioTitle,
  onEndClick,
  elapsedSec,
  questionLabel,
  voiceMuted,
  onToggleVoiceMute,
  onSettingsClick,
}) {
  return (
    <header
      style={{
        minHeight: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        rowGap: 8,
        padding: '10px 16px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
        <button
          type="button"
          onClick={onEndClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
            color: '#b91c1c',
            background: 'white',
            border: '1px solid #fecaca',
            borderRadius: 8,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={16} />
          End Interview
        </button>
        <span
          style={{
            fontSize: 14,
            color: '#6b7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={scenarioTitle}
        >
          {scenarioTitle || 'Mock interview'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Clock size={18} color="#6b7280" strokeWidth={2} />
        <span style={{ fontWeight: 700, fontSize: 16, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
          {formatElapsed(elapsedSec)}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
        <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap' }}>{questionLabel}</span>
        <button
          type="button"
          title={voiceMuted ? 'Unmute voice input' : 'Mute voice input'}
          onClick={onToggleVoiceMute}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '1px solid #e5e7eb',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {voiceMuted ? <MicOff size={18} color="#6b7280" /> : <Mic size={18} color="#6b7280" />}
        </button>
        <button
          type="button"
          title="Session info"
          onClick={onSettingsClick}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '1px solid #e5e7eb',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Settings size={18} color="#6b7280" />
        </button>
      </div>
    </header>
  );
}
