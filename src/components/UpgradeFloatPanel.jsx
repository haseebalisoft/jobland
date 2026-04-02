import { useEffect, useState } from 'react';
import { X, Zap, Lock, CheckCircle2 } from 'lucide-react';
import api, { setAccessToken } from '../services/api.js';

function formatPrice(price, currency = 'USD') {
  if (Number(price) === 0) return 'Free';
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${Number(price).toFixed(2)}`;
}

function formatPeriod(billingInterval) {
  if (!billingInterval || billingInterval === 'never') return '';
  if (billingInterval === 'one-time') return 'One-time';
  if (billingInterval === 'per_interview') return '/interview';
  if (billingInterval === 'monthly') return '/month';
  if (billingInterval === 'yearly') return '/year';
  return billingInterval;
}

export default function UpgradeFloatPanel({ open, onClose }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startingPlan, setStartingPlan] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api
      .get('/plans')
      .then((res) => {
        if (!cancelled) setPlans(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, open]);

  const subscribe = async (planId) => {
    setError('');
    setStartingPlan(planId);
    try {
      const refresh = await api.post('/auth/refresh-token');
      if (refresh?.data?.accessToken) {
        setAccessToken(refresh.data.accessToken);
      }
      const res = await api.post('/subscriptions/checkout-session', { plan_id: planId });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to start checkout.');
      setStartingPlan('');
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade plan"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 100%)',
          maxHeight: 'min(88vh, 760px)',
          overflowY: 'auto',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 18,
          boxShadow: '0 30px 70px rgba(15,23,42,0.25)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0f172a', fontWeight: 800, fontSize: 18 }}>
              <Lock size={16} />
              Upgrade to unlock this feature
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Choose a plan and continue checkout. You will return here automatically.
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: '#64748b' }}>Loading plans...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
            {plans.map((p) => (
              <section
                key={p.plan_id}
                style={{
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.name}</div>
                <div>
                  <div style={{ fontWeight: 900, color: '#0d9488', fontSize: 24 }}>{formatPrice(p.price, p.currency)}</div>
                  {formatPeriod(p.billing_interval) ? (
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', marginTop: 2 }}>{formatPeriod(p.billing_interval)}</div>
                  ) : null}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', minHeight: 32 }}>{p.description || 'Upgrade for full access.'}</div>
                <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={13} color="#0d9488" />
                  Instant access after payment
                </div>
                <button
                  key={p.plan_id}
                  type="button"
                  onClick={() => subscribe(p.plan_id)}
                  disabled={startingPlan === p.plan_id}
                  style={{
                    marginTop: 'auto',
                    textAlign: 'center',
                    border: 'none',
                    background: '#0d9488',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={12} />
                    {startingPlan === p.plan_id ? 'Redirecting...' : 'Choose plan'}
                  </span>
                </button>
              </section>
            ))}
          </div>
        )}
        {error && <div style={{ marginTop: 10, fontSize: 12, color: '#b91c1c' }}>{error}</div>}
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#334155',
              borderRadius: 10,
              padding: '8px 12px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
