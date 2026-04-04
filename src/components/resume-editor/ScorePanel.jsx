import { X, Check, X as XIcon } from 'lucide-react';
import { computeResumeScore } from './editorUtils.js';

export default function ScorePanel({ open, onClose, profile }) {
  if (!open) return null;
  const { total, breakdown } = computeResumeScore(profile);

  const Row = ({ ok, label, detail }) => (
    <div className="re-score-row">
      {ok ? <Check size={16} color="#16a34a" /> : <XIcon size={16} color="#dc2626" />}
      <div>
        <strong>{label}</strong>
        {detail ? <div style={{ fontSize: 12, color: '#64748b' }}>{detail}</div> : null}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" style={{ position: 'fixed', inset: 0, zIndex: 199, border: 'none', background: 'rgba(15,23,42,0.25)' }} aria-label="Close" onClick={onClose} />
      <aside className="re-score-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Resume score</h3>
          <button type="button" className="re-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>
          Estimated score: <strong>{total}</strong> / 100 (client-side checklist — recalculates as you edit).
        </p>
        <Row ok={breakdown.contact?.ok} label="Contact info" detail={breakdown.contact?.ok ? 'Present' : 'Add email, phone, location'} />
        <Row ok={breakdown.summary?.ok} label="Professional summary" detail={breakdown.summary?.ok ? 'Looks substantive' : 'Add a fuller summary'} />
        <Row ok={breakdown.work?.ok} label="Work experience" detail={`${breakdown.work?.count ?? 0} role(s)`} />
        <Row ok={breakdown.skills?.ok} label="Skills" detail={breakdown.skills?.ok ? 'Enough keywords' : 'Add more skills'} />
        <Row ok={breakdown.education?.ok} label="Education" />
        <Row ok={breakdown.projects?.ok} label="Projects" detail="Optional" />
        <h4 style={{ marginTop: 24, fontSize: 14 }}>Improve score</h4>
        <ul style={{ fontSize: 13, color: '#475569', paddingLeft: 18, lineHeight: 1.5 }}>
          <li>Quantify achievements with metrics in experience bullets.</li>
          <li>Align your summary with your target role.</li>
          <li>Fill gaps shown above.</li>
        </ul>
      </aside>
    </>
  );
}
