export default function ResumePreview({ profile, design, paperSize: _paperSize = 'a4' }) {
  if (!profile) return null;
  const font = design?.fontFamily || "'Times New Roman', Times, serif";
  const fs = Number(design?.fontSizePt) || 11;
  const lh = Number(design?.lineHeight) || 1.125;

  const name = profile.personal?.fullName || 'Your Name';
  const phone = (profile.personal?.phone || '').trim();
  const email = (profile.personal?.email || '').trim();
  const loc = (profile.personal?.location || '').trim();

  const summary = (profile.professional?.summary || '').trim();
  const work = profile.professional?.workExperience || [];
  const hasWorkContent = work.some(
    (w) =>
      (w.company || '').trim() ||
      (w.role || '').trim() ||
      (w.description || '').trim() ||
      (w.period || '').trim(),
  );
  const education = profile.education || [];
  const eduText = education
    .map((e) => [e.degree, e.institution, e.period || e.year].filter(Boolean).join(' — '))
    .filter(Boolean)
    .join('\n');
  const skills = profile.professional?.skills || [];
  const skillsText = skills.length ? skills.join(', ') : '';
  const accent = design?.accentColor || design?.primaryColor || '#7c3aed';

  return (
    <div className="re-paper-wrap">
      <article
        className="re-paper"
        style={{
          padding: 40,
          fontFamily: font,
          fontSize: fs,
          lineHeight: lh,
          color: '#0f172a',
          minHeight: 400,
          '--paper-accent': accent,
        }}
      >
        <h1 className="re-paper__name" style={{ fontFamily: font }}>
          {name}
        </h1>
        {(() => {
          const parts = [phone, email, loc].filter(Boolean);
          if (parts.length === 0) return null;
          return (
            <div className="re-paper__contact">
              {parts.map((p, i) => (
                <span key={i}>
                  {i > 0 ? <span> · </span> : null}
                  {p.includes('@') ? (
                    <a href={`mailto:${p}`}>{p}</a>
                  ) : (
                    <span>{p}</span>
                  )}
                </span>
              ))}
            </div>
          );
        })()}

        <div>
          <div className="re-paper__section-title">Professional Summary</div>
          <div className="re-paper__section-body">
            {summary ? (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{summary}</p>
            ) : (
              <span className="re-paper__dash">—</span>
            )}
          </div>
        </div>

        <div>
          <div className="re-paper__section-title">Experience</div>
          <div className="re-paper__section-body">
            {!hasWorkContent ? (
              <p className="re-paper__placeholder" style={{ margin: 0 }}>
                Add work experience to view AI highlights.
              </p>
            ) : (
              work.map((w, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700 }}>
                    {(w.role || '').trim() || 'Role'}
                    {(w.company || '').trim() ? ` — ${(w.company || '').trim()}` : ''}
                  </div>
                  {(w.period || '').trim() ? (
                    <div style={{ fontSize: fs, color: '#64748b' }}>{(w.period || '').trim()}</div>
                  ) : null}
                  {(w.description || '').trim() ? (
                    <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{(w.description || '').trim()}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="re-paper__section-title">Education</div>
          <div className="re-paper__section-body">
            {eduText ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{eduText}</p> : <span className="re-paper__dash">—</span>}
          </div>
        </div>

        <div>
          <div className="re-paper__section-title">Skills</div>
          <div className="re-paper__section-body">{skillsText || <span className="re-paper__dash">—</span>}</div>
        </div>
      </article>
    </div>
  );
}
