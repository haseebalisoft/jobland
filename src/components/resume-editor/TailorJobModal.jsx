import { X } from 'lucide-react';

export default function TailorJobModal({ open, onClose, jobTitle, setJobTitle, companyName, setCompanyName, jobDescription, setJobDescription, onSubmit, loading }) {
  if (!open) return null;
  return (
    <div className="re-modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="re-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Tailor for Job</h2>
          <button type="button" className="re-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 0 }}>
          Paste the job description. We&apos;ll analyze gaps and prepare optimization (same flow as AI Tools).
        </p>
        <div className="re-field">
          <label>Job title</label>
          <input className="re-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>
        <div className="re-field">
          <label>Company</label>
          <input className="re-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </div>
        <div className="re-field">
          <label>Job description</label>
          <textarea className="re-textarea" rows={8} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the full job description…" />
        </div>
        <button type="button" className="re-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading} onClick={onSubmit}>
          {loading ? 'Analyzing…' : 'Analyze & optimize'}
        </button>
      </div>
    </div>
  );
}
