import { FileText, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProgressCard({ items = [], completedSteps = 0, totalSteps = 0 }) {
  const navigate = useNavigate();
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const go = (id) => {
    if (id === 'base_resume') navigate('/resume-maker');
    if (id === 'linkedin') navigate('/profile-builder');
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
        padding: 20,
        minHeight: 280,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Your Progress</span>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          {completedSteps}/{totalSteps || 0}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: '#e2e8f0',
          overflow: 'hidden',
          marginBottom: 18,
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb', borderRadius: 999, transition: 'width .3s' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) => {
          const active = it.id === 'base_resume';
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => go(it.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: active ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
              }}
            >
              {it.id === 'linkedin' ? (
                <Linkedin size={20} color="#0a66c2" />
              ) : (
                <FileText size={20} color="#2563eb" />
              )}
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{it.label}</span>
              {it.completed && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>Done</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
