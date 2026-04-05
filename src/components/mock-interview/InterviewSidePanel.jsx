import React from 'react';
import { Clock } from 'lucide-react';
import { categoryBadgeStyle, getScenarioIconMeta } from './scenarioIcons.jsx';

function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function InterviewSidePanel({
  open,
  scenario,
  elapsedSec,
  focusAreas,
  checkedFocus,
  onToggleFocus,
  notes,
  onNotesChange,
  onEndInterview,
}) {
  if (!open || !scenario) return null;
  const badge = categoryBadgeStyle(scenario.category);
  const { Icon, color } = getScenarioIconMeta(scenario.icon_type);
  const totalMin = scenario.duration_mins || 25;

  return (
    <aside
      className="ic-panel-slide"
      style={{
        width: 280,
        flexShrink: 0,
        background: 'white',
        borderLeft: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '4px 10px',
            borderRadius: 999,
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            color: badge.text,
            marginBottom: 10,
          }}
        >
          {scenario.category || 'Interview'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color }}>
            <Icon size={28} strokeWidth={2} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{scenario.title}</h3>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0 0', fontSize: 13, color: '#64748b' }}>
          <Clock size={14} />
          {formatElapsed(elapsedSec)} elapsed · ~{totalMin} min planned
        </p>
      </div>

      <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: '#374151', margin: '0 0 8px' }}>Key focus areas</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
          {(focusAreas || []).map((f) => (
            <li key={f} style={{ marginBottom: 8 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={Boolean(checkedFocus?.[f])}
                  onChange={() => onToggleFocus?.(f)}
                  style={{ marginTop: 2 }}
                />
                <span>{f}</span>
              </label>
            </li>
          ))}
        </ul>

        <p style={{ fontWeight: 700, fontSize: 13, color: '#374151', margin: '0 0 8px' }}>Your notes</p>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 6px' }}>Private — not sent to the AI.</p>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange?.(e.target.value)}
          placeholder="Jot down talking points…"
          style={{
            width: '100%',
            minHeight: 100,
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: 10,
            fontSize: 13,
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ padding: 16, borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={onEndInterview}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: 14,
            fontWeight: 600,
            color: 'white',
            background: '#dc2626',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          End Interview
        </button>
      </div>
    </aside>
  );
}
