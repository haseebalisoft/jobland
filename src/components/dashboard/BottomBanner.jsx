export default function BottomBanner({ title = '', subtitle = '' }) {
  return (
    <section
      style={{
        marginTop: 36,
        padding: '28px 32px',
        borderRadius: 16,
        background: '#fff',
        border: '1px solid #e2e8f0',
        display: 'grid',
        gridTemplateColumns: '1fr 200px',
        gap: 24,
        alignItems: 'center',
      }}
    >
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.55 }}>{subtitle}</p>
      </div>
      <div style={{ justifySelf: 'end' }} aria-hidden>
        <svg width="180" height="120" viewBox="0 0 180 120">
          <circle cx="90" cy="60" r="52" fill="none" stroke="#bfdbfe" strokeWidth="2" />
          <circle cx="90" cy="60" r="38" fill="none" stroke="#93c5fd" strokeWidth="2" />
          <circle cx="90" cy="60" r="24" fill="#dbeafe" />
          <rect x="78" y="48" width="24" height="28" rx="3" fill="#2563eb" opacity="0.9" />
          <text x="90" y="66" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">
            HL
          </text>
        </svg>
      </div>
    </section>
  );
}
