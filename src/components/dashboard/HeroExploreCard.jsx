import { useNavigate } from 'react-router-dom';

export default function HeroExploreCard({ title = '', subtitle = '', ctaLabel = '', ctaPath = '/dashboard/score-resume' }) {
  const navigate = useNavigate();
  return (
    <section
      style={{
        marginTop: 32,
        marginBottom: 28,
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)',
        padding: '28px 32px',
        display: 'grid',
        gridTemplateColumns: '1fr minmax(160px, 220px)',
        gap: 24,
        alignItems: 'center',
      }}
      className="dh-hero-card"
    >
      <div>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.55, color: '#64748b' }}>{subtitle}</p>
        <button
          type="button"
          onClick={() => navigate(ctaPath || '/dashboard/score-resume')}
          style={{
            padding: '11px 20px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#0f172a',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </button>
      </div>
      <div style={{ justifySelf: 'center' }} aria-hidden>
        <svg width="200" height="160" viewBox="0 0 200 160">
          <circle cx="100" cy="80" r="70" fill="none" stroke="#bfdbfe" strokeWidth="2" />
          <circle cx="100" cy="80" r="52" fill="none" stroke="#93c5fd" strokeWidth="2" />
          <circle cx="100" cy="80" r="34" fill="#dbeafe" />
          <path d="M100 62 L108 78 L124 80 L112 90 L116 106 L100 98 L84 106 L88 90 L76 80 L92 78 Z" fill="#2563eb" opacity="0.95" />
          <rect x="42" y="38" width="18" height="22" rx="3" fill="#fff" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="158" cy="48" r="10" fill="#e0f2fe" stroke="#38bdf8" />
          <rect x="150" y="102" width="22" height="16" rx="2" fill="#f1f5f9" stroke="#cbd5e1" />
        </svg>
      </div>
    </section>
  );
}
