import { useEffect, useState } from 'react'
import { Check, Zap, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './Pricing.css'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function formatPrice(price, currency = 'USD') {
  if (price === 0) return 'Free'
  const symbol = currency === 'USD' ? '$' : currency
  return `${symbol}${Number(price).toFixed(2)}`
}

function formatPeriod(billing_interval) {
  if (!billing_interval || billing_interval === 'never') return ''
  if (billing_interval === 'one-time') return 'One-time'
  if (billing_interval === 'monthly') return '/month'
  return billing_interval
}

// Default features per plan_id when backend doesn't provide them
const DEFAULT_FEATURES = {
  professional_resume: [
    'Pro ATS-Optimized CV',
    'Keyword Research',
    '24h Delivery',
    'Editable File (DOCX)',
  ],
  starter: [
    '1 Guaranteed Interview',
    'Professional ATS CV',
    'Job Applications included',
    'Email Support',
  ],
  success: [
    '3 Guaranteed Interviews',
    'Professional ATS CV',
    'Job Applications included',
    'Priority Support',
  ],
  elite: [
    '6 Guaranteed Interviews',
    'Professional ATS CV',
    'Job Applications included',
    'WhatsApp Priority Support',
  ],
}

export default function Pricing() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [startingPlan, setStartingPlan] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/plans')
      .then((res) => {
        const apiPlans = res.data || []
        setPlans(
          apiPlans.map((p) => ({
            plan_id: p.plan_id,
            name: p.name,
            price: p.price,
            currency: p.currency || 'USD',
            billing_interval: p.billing_interval || 'monthly',
            description: p.description || '',
            period: formatPeriod(p.billing_interval),
            priceFormatted: formatPrice(p.price, p.currency),
            popular: p.plan_id === 'success',
            features: DEFAULT_FEATURES[p.plan_id] || [],
          })),
        )
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false))
  }, [])

  const handleGetStarted = async (plan) => {
    localStorage.setItem('selectedPlanName', plan.name)
    setStartingPlan(plan.plan_id)

    if (user && user.role === 'user') {
      try {
        const res = await api.post('/subscriptions/checkout-session', {
          plan_id: plan.plan_id,
        })
        window.location.href = res.data.url
        return
      } catch (err) {
        console.error('Unable to start Stripe checkout for logged-in user', err)
        setStartingPlan('')
        return
      }
    }

    navigate(`/start?plan=${encodeURIComponent(plan.name)}`)
  }

  if (loading) {
    return (
      <section id="pricing" className="pricing-section section">
        <div className="container">
          <div className="text-center">
            <div className="section-label">💰 Pricing</div>
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">Loading plans...</p>
          </div>
        </div>
      </section>
    )
  }

  if (plans.length === 0) {
    return (
      <section id="pricing" className="pricing-section section">
        <div className="container">
          <div className="text-center">
            <div className="section-label">💰 Pricing</div>
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">No plans available at the moment.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="pricing" className="pricing-section section">
      <div className="container">
        <div className="text-center">
          <div className="section-label">💰 Pricing</div>
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">
            No hidden fees. No contracts. Pay for what works.
          </p>
        </div>

        <div className="pricing-cards">
          {plans.map((plan, i) => (
            <div
              key={plan.plan_id}
              className={`pricing-card ${plan.popular ? 'pricing-card--popular' : ''}`}
            >
              {plan.popular && (
                <div className="pricing-badge">
                  <Star size={12} fill="currentColor" /> Most Popular
                </div>
              )}

              <div className="pricing-header">
                <h3 className="pricing-name">
                  {plan.name}
                </h3>
                <div className="pricing-price-area">
                  {/* Original price with strike-through and "OFF" tag */}
                  {plan.price > 0 && (
                    <div className="pricing-original-row">
                      <span className="pricing-original-strike">
                        {/* Simple static “before” prices for each plan */}
                        {plan.plan_id === 'professional_resume' && '$25.55'}
                        {plan.plan_id === 'starter' && '$39.99'}
                        {plan.plan_id === 'success' && '$79.99'}
                        {plan.plan_id === 'elite' && '$129.99'}
                      </span>
                      <span className="pricing-off-tag">OFF</span>
                    </div>
                  )}
                  <div className="pricing-main-row">
                    <span className="pricing-now">
                      {plan.priceFormatted}
                    </span>
                    <span className="pricing-period-meta">
                      {plan.period}
                    </span>
                  </div>
                </div>
                <p className="pricing-desc">
                  {plan.description}
                </p>
              </div>

              <div className="pricing-divider" />

              {plan.features && plan.features.length > 0 && (
                <ul className="pricing-features">
                  {plan.features.map((f, j) => (
                    <li key={j} className="pricing-feature">
                      <span
                        className="pricing-check"
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                className={`btn btn-lg pricing-cta ${
                  plan.popular ? 'pricing-cta--inverted' : 'btn-primary'
                }`}
                disabled={startingPlan === plan.plan_id}
                onClick={() => handleGetStarted(plan)}
              >
                <Zap
                  size={16}
                  fill={plan.popular ? '#2563EB' : 'white'}
                />
                {startingPlan === plan.plan_id ? 'Redirecting...' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        <div className="pricing-note">
          <p>
            🔒 Secure payment · Cancel anytime · 100% satisfaction guaranteed ·
            Questions? <a href="#faq">See FAQ</a>
          </p>
        </div>
      </div>
    </section>
  )
}
