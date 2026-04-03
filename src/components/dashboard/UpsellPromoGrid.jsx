import { useNavigate } from 'react-router-dom';
import { Star, Check } from 'lucide-react';

export default function UpsellPromoGrid({ upsell = null, promos = [], showUpsell = true }) {
  const navigate = useNavigate();

  if (!showUpsell || !upsell) {
    return (
      <section style={{ marginBottom: 32 }} className="dh-upsell-promo">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}
          className="dh-promo-only-grid"
        >
          {(promos || []).map((p) => (
            <PromoCard key={p.id} p={p} navigate={navigate} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 32 }} className="dh-upsell-promo">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          alignItems: 'stretch',
        }}
        className="dh-upsell-grid"
      >
        {upsell && (
          <div
            style={{
              border: '3px solid #fbbf24',
              borderRadius: 16,
              background: '#fffbeb',
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 13, color: '#92400e' }}>{upsell.label}</p>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: '#78716c' }}>
              <span style={{ textDecoration: 'line-through' }}>{upsell.crossedPrice}</span>
            </p>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>
              {upsell.price}
              <span style={{ fontSize: 16, fontWeight: 700 }}>{upsell.pricePeriod}</span>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#57534e', lineHeight: 1.5 }}>{upsell.description}</p>
            <button
              type="button"
              onClick={() => navigate(upsell.ctaPath || '/checkout')}
              style={{
                width: '100%',
                maxWidth: 280,
                padding: '14px 20px',
                borderRadius: 10,
                border: 'none',
                background: '#f59e0b',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 20,
              }}
            >
              <Star size={18} fill="#0f172a" />
              {upsell.ctaLabel}
            </button>
            <p style={{ alignSelf: 'stretch', textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#44403c', marginBottom: 8 }}>
              All free features, plus:
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', alignSelf: 'stretch', textAlign: 'left' }}>
              {(upsell.features || []).map((f) => (
                <li
                  key={f}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 13,
                    color: '#57534e',
                    marginBottom: 6,
                  }}
                >
                  <Check size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(promos || []).map((p) => (
            <PromoCard key={p.id} p={p} navigate={navigate} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoCard({ p, navigate }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: '20px 22px',
        display: 'grid',
        gridTemplateColumns: '1fr minmax(80px, 100px)',
        gap: 16,
        alignItems: 'center',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
      }}
      className="dh-promo-card"
    >
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{p.title}</h3>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{p.body}</p>
        <button
          type="button"
          onClick={() => navigate(p.path || '/')}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            color: '#0f172a',
          }}
        >
          {p.ctaLabel}
        </button>
      </div>
      <div
        aria-hidden
        style={{
          height: 88,
          borderRadius: 12,
          background: p.id === 'extension' ? 'linear-gradient(135deg,#dbeafe,#eff6ff)' : 'linear-gradient(135deg,#e0f2fe,#f0f9ff)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
        }}
      >
        {p.id === 'extension' ? '🌐' : '👤'}
      </div>
    </div>
  );
}
