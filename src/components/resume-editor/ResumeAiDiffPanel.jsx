import { Check, X } from 'lucide-react';
import { InlineDiffText } from './inlineDiff.jsx';

export default function ResumeAiDiffPanel({
  profile,
  aiChanges,
  isPendingChange,
  pendingOptimizedProfile,
  acceptAiChange,
  rejectAiChange,
  acceptAllPendingAiChanges,
  discardAllPendingAiChanges,
}) {
  if (!profile) return null;

  const summaryChange = aiChanges.find(
    (c) => isPendingChange(c) && (c.section === 'Summary' || c.key === 'summary'),
  );
  const expPending = aiChanges.filter(
    (c) => isPendingChange(c) && c.section === 'Experience' && c.expIndex != null,
  );
  const expDiffByIndex = new Map();
  [...expPending].reverse().forEach((c) => {
    expDiffByIndex.set(c.expIndex, c);
  });

  const work = profile.professional?.workExperience || [];
  const education = profile.education || [];
  const skills = profile.professional?.skills || [];

  return (
    <div style={{ height: '100%', padding: '24px 28px', overflowY: 'auto', background: 'white', maxWidth: 900, margin: '0 auto' }}>
      {pendingOptimizedProfile && aiChanges.filter((c) => isPendingChange(c) && c.source === 'full-jd').length > 0 && (
        <div className="rb-ai-hunk rb-ai-hunk--batch" style={{ marginBottom: 16 }}>
          <div className="rb-ai-hunk-actions rb-ai-hunk-actions--batch">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Job description optimization</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="rb-ai-btn rb-ai-btn--keep" onClick={acceptAllPendingAiChanges}>
                <Check size={14} /> Apply all changes
              </button>
              <button type="button" className="rb-ai-btn rb-ai-btn--discard" onClick={discardAllPendingAiChanges}>
                <X size={14} /> Discard all
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{profile.personal?.fullName || 'Your Name'}</h2>
        <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>{profile.professional?.currentTitle || ''}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
          {[profile.personal?.email, profile.personal?.phone, profile.personal?.location].filter(Boolean).join(' · ')}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
            Professional Summary
          </div>
          {summaryChange ? (
            <div className="rb-ai-hunk">
              <div className="rb-ai-hunk-actions">
                <button type="button" className="rb-ai-btn rb-ai-btn--keep" onClick={() => acceptAiChange(summaryChange.id)}>
                  <Check size={14} /> Keep
                </button>
                <button type="button" className="rb-ai-btn rb-ai-btn--discard" onClick={() => rejectAiChange(summaryChange.id)}>
                  <X size={14} /> Discard
                </button>
              </div>
              <div className="rb-ai-hunk-body">
                <InlineDiffText before={summaryChange.before} after={summaryChange.after} />
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{profile.professional?.summary || '—'}</div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
            Experience
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {work.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6b7280' }}>Add work experience to view AI highlights.</div>
            ) : (
              work.map((w, idx) => {
                const diff = expDiffByIndex.get(idx);
                return (
                  <div key={idx}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{w.role || w.company || `Experience ${idx + 1}`}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{[w.company, w.period].filter(Boolean).join(' • ')}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: '#0f172a', lineHeight: 1.6 }}>
                      {diff ? (
                        <div className="rb-ai-hunk">
                          <div className="rb-ai-hunk-actions">
                            <button type="button" className="rb-ai-btn rb-ai-btn--keep" onClick={() => acceptAiChange(diff.id)}>
                              <Check size={14} /> Keep
                            </button>
                            <button type="button" className="rb-ai-btn rb-ai-btn--discard" onClick={() => rejectAiChange(diff.id)}>
                              <X size={14} /> Discard
                            </button>
                          </div>
                          <div className="rb-ai-hunk-body">
                            <InlineDiffText before={diff.before} after={diff.after} />
                          </div>
                        </div>
                      ) : (
                        <span>{w.description || ''}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
            Education
          </div>
          {education.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6b7280' }}>—</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {education.map((e, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{e.degree || e.institution || `Education ${i + 1}`}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{[e.institution, e.period || e.year].filter(Boolean).join(' • ')}</div>
                  {e.description ? (
                    <div style={{ fontSize: 12, color: '#0f172a', marginTop: 6, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{e.description}</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111827', marginBottom: 8 }}>
            Skills
          </div>
          {skills.length === 0 ? (
            <div style={{ fontSize: 12, color: '#6b7280' }}>—</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skills.map((s, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    padding: '6px 10px',
                    borderRadius: 999,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
