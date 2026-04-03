import { useNavigate } from 'react-router-dom';

function KanbanPreview() {
  const cols = ['Wishlist', 'Applied', 'Interview'];
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '12px 8px' }}>
      {cols.map((c) => (
        <div
          key={c}
          style={{
            flex: 1,
            minWidth: 0,
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            padding: '8px 6px',
            fontSize: 9,
            fontWeight: 700,
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          {c}
          <div style={{ marginTop: 6, height: 28, background: '#fff', borderRadius: 4, border: '1px dashed #cbd5e1' }} />
        </div>
      ))}
    </div>
  );
}

function ContactsPreview() {
  return (
    <div style={{ padding: '12px 16px' }}>
      {[1, 2].map((i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 999, background: '#e2e8f0' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, width: '70%', background: '#e2e8f0', borderRadius: 4, marginBottom: 4 }} />
            <div style={{ height: 5, width: '45%', background: '#f1f5f9', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QuickStatsSection({ sectionTitle = 'Quick Stats', cards = [] }) {
  const navigate = useNavigate();
  return (
    <section style={{ marginTop: 8, marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>{sectionTitle}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
        }}
        className="dh-quick-stats"
      >
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate(c.path || '/dashboard')}
            style={{
              textAlign: 'center',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: '24px 20px 16px',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>{c.title}</div>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>{c.description}</p>
            <div style={{ pointerEvents: 'none' }}>
              {c.visual === 'contacts' ? <ContactsPreview /> : <KanbanPreview />}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
