import { FileText } from 'lucide-react';

export default function ActionPanel({
  tag = 'Resume & Profile',
  title = '',
  body = '',
  ctaLabel = 'Create New Base Resume',
  onCta,
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        padding: 24,
        minHeight: 280,
        display: 'grid',
        gridTemplateColumns: '1fr minmax(120px, 160px)',
        gap: 20,
        alignItems: 'center',
      }}
    >
      <div>
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#0d9488',
            background: 'rgba(13,148,136,0.12)',
            padding: '4px 10px',
            borderRadius: 999,
            marginBottom: 12,
          }}
        >
          {tag}
        </span>
        <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.55, color: '#64748b' }}>{body}</p>
        <button
          type="button"
          onClick={onCta}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <FileText size={18} />
          {ctaLabel}
        </button>
      </div>
      <div
        aria-hidden
        style={{
          borderRadius: 12,
          background: 'linear-gradient(145deg, #ecfdf5 0%, #e0f2fe 50%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          minHeight: 160,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '12%',
            right: '12%',
            top: '18%',
            bottom: '22%',
            background: '#fff',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
            border: '1px solid #e2e8f0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '12%',
            right: '40%',
            top: '18%',
            height: 22,
            background: '#10b981',
            borderRadius: '6px 6px 0 0',
          }}
        />
      </div>
    </div>
  );
}
