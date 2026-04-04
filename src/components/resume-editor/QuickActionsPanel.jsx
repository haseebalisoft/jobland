import { MessageSquare } from 'lucide-react';

function ScoreRing({ value, onClick, labelShort, title }) {
  return (
    <button type="button" className="re-ring" onClick={onClick} title={title}>
      <span className="re-ring__circle">
        <span className="re-ring__num">{Math.min(100, Math.max(0, Math.round(Number(value) || 0)))}</span>
      </span>
      <span className="re-qa-label">{labelShort}</span>
    </button>
  );
}

export default function QuickActionsPanel({ scoreValue, skillMatchValue, onScoreClick, onSkillClick, onCommentsClick }) {
  return (
    <div className="re-qa-panel">
      <div className="re-qa-head">Quick Actions</div>
      <div className="re-qa-stack">
        <ScoreRing value={scoreValue} onClick={onScoreClick} labelShort="Resume Sc..." title="Resume Score" />
        <ScoreRing value={skillMatchValue} onClick={onSkillClick} labelShort="Skill Mate..." title="Skill Match" />
        <button type="button" className="re-qa-comments" onClick={onCommentsClick} title="Comments">
          <MessageSquare size={22} strokeWidth={1.75} />
          <span className="re-qa-label">Commen...</span>
        </button>
      </div>
    </div>
  );
}
