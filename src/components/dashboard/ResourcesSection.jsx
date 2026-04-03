import { useNavigate } from 'react-router-dom';
import { ChevronRight, Link2, Sparkles, FileText } from 'lucide-react';

const accentIcon = (accent) => {
  if (accent === 'spark') return <Sparkles size={28} color="#2563eb" />;
  if (accent === 'doc') return <FileText size={28} color="#2563eb" />;
  return <Link2 size={28} color="#2563eb" />;
};

export default function ResourcesSection({ title = 'Resources', viewAllLabel = '', viewAllPath = '/', items = [] }) {
  const navigate = useNavigate();

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{title}</h2>
        <button
          type="button"
          onClick={() => navigate(viewAllPath || '/')}
          style={{ border: 'none', background: 'none', color: '#2563eb', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          {viewAllLabel}
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
        className="dh-resources-grid"
      >
        {items.map((item) => (
          <article
            key={item.id}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
            }}
          >
            <div
              style={{
                height: 120,
                background: 'linear-gradient(180deg,#eff6ff,#fff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              {accentIcon(item.accent)}
            </div>
            <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>{item.title}</h3>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', lineHeight: 1.5, flex: 1 }}>{item.description}</p>
              <button
                type="button"
                onClick={() => navigate(item.readMorePath || '/')}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'none',
                  color: '#2563eb',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                }}
              >
                Read More <ChevronRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
