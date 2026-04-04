import { paperToPx } from './editorUtils.js';

function diamond() {
  return ' \u25C6 ';
}

export default function ResumePreview({ profile, design, paperSize = 'a4' }) {
  if (!profile) return null;
  const { width, minHeight } = paperToPx(paperSize);
  const font = design?.fontFamily || "'Times New Roman', Times, serif";
  const fs = Number(design?.fontSizePt) || 11;
  const lh = Number(design?.lineHeight) || 1.125;
  const mlr = Number(design?.marginLR) ?? 0.39;
  const mtb = Number(design?.marginTB) ?? 0.39;
  const padX = `${mlr}in`;
  const padY = `${mtb}in`;
  const accent = design?.accentColor || '#2563eb';

  const name = profile.personal?.fullName || 'Your Name';
  const phone = profile.personal?.phone || '';
  const email = profile.personal?.email || '';
  const loc = profile.personal?.location || '';
  const parts = [phone, email, loc].filter(Boolean);

  return (
    <div className="re-paper-wrap">
      <article
        className="re-paper"
        style={{
          width,
          minHeight,
          maxWidth: '100%',
          padding: `${padY} ${padX}`,
          fontFamily: font,
          fontSize: fs,
          lineHeight: lh,
          color: '#0f172a',
        }}
      >
        <h1
          className="re-paper__name"
          style={{
            fontFamily: font,
            fontSize: fs + 11,
            fontWeight: 700,
          }}
        >
          {name}
        </h1>
        <div className="re-paper__contact" style={{ color: accent }}>
          {parts.map((p, i) => (
            <span key={i}>
              {i > 0 ? <span style={{ color: '#64748b' }}>{diamond()}</span> : null}
              {p.includes('@') ? (
                <a href={`mailto:${p}`} style={{ color: accent }}>
                  {p}
                </a>
              ) : (
                <span style={{ color: accent }}>{p}</span>
              )}
            </span>
          ))}
        </div>
        {profile.professional?.currentTitle ? (
          <p style={{ textAlign: 'center', margin: '12px 0 8px', fontSize: fs + 1, fontWeight: 600 }}>
            {profile.professional.currentTitle}
          </p>
        ) : null}
        {profile.professional?.summary ? (
          <section style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: fs + 1, fontWeight: 700, borderBottom: `1px solid ${accent}`, paddingBottom: 4 }}>
              Professional Summary
            </h2>
            <p style={{ marginTop: 8, textAlign: 'justify', whiteSpace: 'pre-wrap' }}>{profile.professional.summary}</p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
