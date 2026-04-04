export default function GreetingHeader({ firstName = '', subtitle = '' }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <h1
        style={{
          fontSize: 'clamp(1.5rem, 3vw, 1.85rem)',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}
      >
        Hi, {firstName || 'there'}
      </h1>
      <p style={{ margin: 0, color: '#64748b', fontSize: 15, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
        {subtitle}
      </p>
    </div>
  );
}
