import { MessageSquare } from 'lucide-react';

function Ring({ value, color, onClick, label }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <button type="button" className="re-ring" onClick={onClick} title={label}>
      <span style={{ position: 'relative', width: 56, height: 56, display: 'block' }}>
        <svg width="56" height="56" viewBox="0 0 56 56" style={{ display: 'block' }}>
          <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="re-ring__num">{value}</span>
      </span>
      <span className="re-qa-label">{label}</span>
    </button>
  );
}

export default function QuickActionsPanel({ scoreValue, skillMatchValue, onScoreClick, onSkillClick, onCommentsClick }) {
  return (
    <>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Actions</div>
      <Ring value={scoreValue} color="#ea580c" onClick={onScoreClick} label="Resume Score" />
      <Ring value={skillMatchValue} color="#dc2626" onClick={onSkillClick} label="Skill Match" />
      <button
        type="button"
        onClick={onCommentsClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: '#64748b',
        }}
      >
        <MessageSquare size={24} />
        <span className="re-qa-label">Comments</span>
      </button>
    </>
  );
}
