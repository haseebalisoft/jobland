import api from '../../services/api.js';

const STEPS = ['application_materials', 'jobs', 'networking', 'interviews'];

export default function ProgressStepper({ tabs = [], currentStep = 'application_materials', onStepChange }) {
  const ordered = [...tabs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const setStep = async (id) => {
    if (!STEPS.includes(id)) return;
    try {
      await api.put('/user/progress/step', { step: id });
      onStepChange?.(id);
    } catch {
      onStepChange?.(id);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 28,
        maxWidth: 900,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      {ordered.map((tab, idx) => {
        const active = tab.id === currentStep;
        return (
          <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {idx > 0 && (
              <span
                style={{
                  width: 24,
                  borderTop: '2px dashed #cbd5e1',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => setStep(tab.id)}
              style={{
                border: active ? '2px solid #2563eb' : '1px solid transparent',
                background: active ? '#fff' : 'transparent',
                color: active ? '#1e3a8a' : '#94a3b8',
                fontWeight: active ? 700 : 500,
                fontSize: 13,
                padding: '8px 14px',
                borderRadius: 999,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
