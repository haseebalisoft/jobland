import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { setAccessToken } from '../services/api.js';
import UserSidebar from '../components/UserSidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

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

export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingPlan, setStartingPlan] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/plans')
      .then((res) => {
        if (cancelled) return;
        const paidPlans = (res.data || []).map((p) => ({
          ...p,
          priceFormatted: formatPrice(p.price, p.currency),
          period: formatPeriod(p.billing_interval),
        }));
        setPlans(paidPlans);
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
  }, []);

  const startCheckout = async (plan) => {
    if (!plan?.plan_id) return;
    setError('');
    setStartingPlan(plan.plan_id);
    try {
      // Mirror existing signup/checkout behavior while ensuring auth is fresh.
      const refresh = await api.post('/auth/refresh-token');
      if (refresh?.data?.accessToken) {
        setAccessToken(refresh.data.accessToken);
      }
      const res = await api.post('/subscriptions/checkout-session', {
        plan_id: plan.plan_id,
      });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to start checkout. Please try again.');
      setStartingPlan('');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <UserSidebar />
      <main style={{ flex: 1, padding: '28px 24px 48px', maxWidth: 980, width: '100%', margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Billing & subscriptions</h1>
        <p style={{ color: '#64748b', margin: '8px 0 24px', fontSize: 15 }}>
          Choose a plan for your account{user?.email ? ` (${user.email})` : ''}.
        </p>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading plans...</p>
        ) : plans.length === 0 ? (
          <p style={{ color: '#b91c1c' }}>No paid plans are available right now.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {plans.map((plan) => {
              const current = String(user?.subscription_plan || '').toLowerCase() === String(plan.plan_id || '').toLowerCase();
              return (
                <section
                  key={plan.plan_id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    background: '#fff',
                    padding: 18,
                    boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{plan.name}</h2>
                    <CreditCard size={18} color="#0d9488" />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>
                    {plan.priceFormatted}
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginLeft: 6 }}>{plan.period}</span>
                  </div>
                  {plan.description && <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{plan.description}</p>}
                  <button
                    type="button"
                    onClick={() => startCheckout(plan)}
                    disabled={startingPlan === plan.plan_id || current}
                    style={{
                      marginTop: 'auto',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: current ? '#ecfdf5' : '#0d9488',
                      color: current ? '#047857' : '#fff',
                    }}
                  >
                    {current ? 'Current plan' : startingPlan === plan.plan_id ? 'Redirecting...' : 'Subscribe'}
                  </button>
                </section>
              );
            })}
          </div>
        )}

        {error && <p style={{ marginTop: 14, color: '#b91c1c', fontSize: 14 }}>{error}</p>}

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            marginTop: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
            color: '#334155',
            borderRadius: 10,
            padding: '9px 12px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <CheckCircle2 size={16} />
          Back
        </button>
      </main>
    </div>
  );
}
