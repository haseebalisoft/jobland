import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { setAccessToken } from '../services/api.js';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import PlanCard from '../components/billing/PlanCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import './Billing.css';

function formatPrice(price, currency = 'USD') {
  if (Number(price) === 0) return '$0';
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${Number(price).toFixed(2)}`;
}

function formatPeriod(billingInterval) {
  if (!billingInterval || billingInterval === 'never') return '';
  if (billingInterval === 'one-time') return ' one-time';
  if (billingInterval === 'per_interview') return '/interview';
  if (billingInterval === 'monthly') return '/month';
  if (billingInterval === 'yearly') return '/year';
  return ` /${billingInterval}`;
}

export default function Billing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingPlan, setStartingPlan] = useState('');
  const [error, setError] = useState('');

  const displayName = useMemo(() => user?.name || 'User', [user?.name]);
  const initials = useMemo(() => {
    const n = displayName || '';
    return (
      n
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U'
    );
  }, [displayName]);

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

  const displayPlans = useMemo(() => {
    const free = {
      plan_id: 'free',
      name: 'Free',
      priceFormatted: '$0',
      period: '/month',
      description: '',
      features: ['Core resume tools', 'Limited AI features', 'Community support'],
    };
    const enterprise = {
      plan_id: 'enterprise',
      name: 'Enterprise',
      priceFormatted: 'Custom',
      period: '',
      description: '',
      features: ['Dedicated success manager', 'SSO & security reviews', 'Volume pricing'],
    };
    return [free, ...plans, enterprise];
  }, [plans]);

  const userPlanId = String(user?.subscription_plan || '').toLowerCase();

  const planIsCurrent = (plan) => {
    const pid = String(plan.plan_id || '').toLowerCase();
    if (pid === 'free') {
      return userPlanId === 'free' || userPlanId === '' || !userPlanId;
    }
    if (pid === 'enterprise') {
      return userPlanId === 'enterprise';
    }
    return userPlanId === pid;
  };

  const startCheckout = async (plan) => {
    if (!plan?.plan_id || plan.plan_id === 'free' || plan.plan_id === 'enterprise') return;
    setError('');
    setStartingPlan(plan.plan_id);
    try {
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

  const primaryAction = (plan) => {
    if (plan.plan_id === 'enterprise') {
      window.location.href = 'mailto:support@hirdlogic.com?subject=Enterprise%20plan%20inquiry';
      return;
    }
    if (plan.plan_id === 'free') {
      navigate('/dashboard/score-resume?upgrade=1');
      return;
    }
    startCheckout(plan);
  };

  const primaryLabel = (plan) => {
    if (plan.plan_id === 'enterprise') return 'Contact sales';
    if (plan.plan_id === 'free') return 'Explore free tools';
    return startingPlan === plan.plan_id ? 'Redirecting…' : `Upgrade to ${plan.name}`;
  };

  return (
    <DashboardLayout userName={displayName} userInitials={initials}>
      <div className="hl-bill-page">
        <header className="hl-bill-hero">
          <h1 className="hl-bill-title">Billing & subscriptions</h1>
          <p className="hl-bill-lead">
            Choose a plan for your account (<strong>{user?.email || '—'}</strong>)
          </p>
        </header>

        {loading ? (
          <p className="hl-bill-loading">Loading plans…</p>
        ) : (
          <div className="hl-bill-stack">
            {displayPlans.map((plan) => {
              const current = planIsCurrent(plan);
              const isEnt = plan.plan_id === 'enterprise';
              const isFree = plan.plan_id === 'free';
              return (
                <PlanCard
                  key={plan.plan_id}
                  name={plan.name}
                  priceDisplay={plan.priceFormatted}
                  periodLabel={plan.period}
                  description={plan.description}
                  features={plan.features}
                  isCurrent={current}
                  isEnterprise={isEnt}
                  isFree={isFree}
                  onPrimaryClick={() => primaryAction(plan)}
                  primaryDisabled={startingPlan === plan.plan_id && !isFree && !isEnt}
                  primaryLabel={primaryLabel(plan)}
                />
              );
            })}
          </div>
        )}

        {error ? <p className="hl-bill-error">{error}</p> : null}

        <button type="button" className="hl-bill-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} aria-hidden />
          Back
        </button>
      </div>
    </DashboardLayout>
  );
}
