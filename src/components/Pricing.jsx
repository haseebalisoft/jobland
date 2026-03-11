import { useEffect, useState } from 'react'
import { Check, Zap, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './Pricing.css'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

// Static design data – keeps your original layout/labels exactly the same
const BASE_PLANS = [
    {
        name: 'Professional Resume',
        now: '$15',
        original: '$25',
        discount: '40% OFF',
        savings: 'Save $10',
        period: 'One-time',
        description: 'Get a professional, ATS-optimized CV that lands you interviews.',
        features: [
            'Pro ATS-Optimized CV',
            'Keyword Research',
            '24h Delivery',
            'Editable File (DOCX)',
        ],
        cta: 'Get Resume',
        popular: false,
        color: 'var(--dark)',
        bg: 'var(--white)',
    },
    {
        name: 'Starter Pack',
        now: '$30',
        original: '$40',
        discount: '25% OFF',
        savings: 'Save $10',
        period: '1 interview',
        description: 'Perfect for individual applications.',
        features: [
            '1 Guaranteed Interview',
            'Professional ATS CV',
            'Job Applications included',
            'Email Support',
        ],
        cta: 'Get Started',
        popular: false,
        color: 'var(--dark)',
        bg: 'var(--white)',
    },
    {
        name: 'Success Pack',
        now: '$60',
        original: '$100',
        discount: '40% OFF',
        savings: 'Save $40',
        period: '3 interviews',
        description: 'Our most popular result-driven plan.',
        features: [
            '3 Guaranteed Interviews',
            'Professional ATS CV',
            'Job Applications included',
            'Priority Support',
        ],
        cta: 'Landed Interviews',
        popular: true,
        color: 'white',
        bg: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    },
    {
        name: 'Elite Pack',
        now: '$100',
        original: '$165',
        discount: '40% OFF',
        savings: 'Save $65',
        period: '6 interviews',
        description: 'Maximum exposure for serious career growth.',
        features: [
            '6 Guaranteed Interviews',
            'Professional ATS CV',
            'Job Applications included',
            'WhatsApp Priority Support',
        ],
        cta: 'Go Elite',
        popular: false,
        color: 'var(--dark)',
        bg: 'var(--white)',
    },
]

export default function Pricing() {
    const { user } = useAuth()
    const [plans, setPlans] = useState(BASE_PLANS)
    const [startingPlan, setStartingPlan] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        // Fetch plan IDs/prices from backend and merge into static design
        api.get('/plans')
            .then((res) => {
                const apiPlans = res.data || []
                setPlans(
                    BASE_PLANS.map((p) => {
                        const match = apiPlans.find((ap) => ap.name === p.name)
                        return match
                            ? {
                                ...p,
                                apiId: match.id,
                                apiPrice: match.priceCents,
                            }
                            : p
                    }),
                )
            })
            .catch(() => {
                setPlans(BASE_PLANS)
            })
    }, [])

    const handleGetStarted = async (plan) => {
        // Save plan name for any legacy flows that still use it
        localStorage.setItem('selectedPlanName', plan.name)
        setStartingPlan(plan.name)

        // If user is already logged in and is a normal user, skip email/OTP and go straight to Stripe
        if (user && user.role === 'user') {
            try {
                const res = await api.post('/subscriptions/checkout-session', {
                    plan_id: plan.apiId || plan.name,
                })
                window.location.href = res.data.url
                return
            } catch (err) {
                console.error('Unable to start Stripe checkout for logged-in user', err)
                setStartingPlan('')
                return
            }
        }

        // Anonymous flow: send user into full-screen onboarding
        navigate(`/start?plan=${encodeURIComponent(plan.name)}`)
    }
    return (
        <section id="pricing" className="pricing-section section">
            <div className="container">
                <div className="text-center">
                    <div className="section-label">💰 Pricing</div>
                    <h2 className="section-title">Simple, Transparent Pricing</h2>
                    <p className="section-subtitle">
                        No hidden fees. No contracts. Pay for what works — or go unlimited for just $30/month.
                    </p>
                </div>

                <div className="pricing-cards">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`pricing-card ${plan.popular ? 'pricing-card--popular' : ''}`}
                            style={{ background: plan.bg }}
                        >
                            {plan.popular && (
                                <div className="pricing-badge">
                                    <Star size={12} fill="currentColor" /> Most Popular
                                </div>
                            )}

                            <div className="pricing-header">
                                <h3 className="pricing-name" style={{ color: plan.popular ? 'rgba(255,255,255,0.85)' : 'var(--gray)' }}>
                                    {plan.name}
                                </h3>
                                <div className="pricing-price-area">
                                    <div className="pricing-top-right-badge">
                                        <span
                                            className="discount-badge"
                                            style={{
                                                background: 'linear-gradient(135deg, #2563EB 0%, #22C55E 100%)',
                                                color: '#FFFFFF',
                                            }}
                                        >
                                            {plan.discount}
                                        </span>
                                    </div>
                                    <div className="pricing-original-strike">
                                        {plan.original}
                                    </div>
                                    <div className="pricing-main-row">
                                        <span className="pricing-now" style={{ color: plan.popular ? 'white' : 'var(--dark)' }}>
                                            {plan.now}
                                        </span>
                                        <span className="pricing-period-meta" style={{ color: plan.popular ? 'rgba(255,255,255,0.7)' : 'var(--gray)' }}>
                                            {plan.period}
                                        </span>
                                    </div>
                                    {/* Savings text can be computed on backend if needed */}
                                </div>
                                <p className="pricing-desc" style={{ color: plan.popular ? 'rgba(255,255,255,0.75)' : 'var(--gray)' }}>
                                    {plan.description}
                                </p>
                            </div>

                            <div className="pricing-divider" style={{ background: plan.popular ? 'rgba(255,255,255,0.15)' : 'var(--gray-border)' }} />

                            <ul className="pricing-features">
                                {plan.features.map((f, j) => (
                                    <li key={j} className="pricing-feature">
                                        <span className="pricing-check" style={{
                                            background: plan.popular ? 'rgba(255,255,255,0.2)' : 'var(--accent-light)',
                                            color: plan.popular ? 'white' : 'var(--accent)',
                                        }}>
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                        <span style={{ color: plan.popular ? 'rgba(255,255,255,0.9)' : 'var(--dark)' }}>
                                            {f}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                className={`btn btn-lg pricing-cta ${plan.popular ? 'pricing-cta--inverted' : 'btn-primary'}`}
                                disabled={startingPlan === plan.name}
                                onClick={() => handleGetStarted(plan)}
                            >
                                <Zap size={16} fill={plan.popular ? '#4F46E5' : 'white'} />
                                {startingPlan === plan.name ? 'Redirecting...' : 'Get Started'}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="pricing-note">
                    <p>🔒 Secure payment · Cancel anytime · 100% satisfaction guaranteed · Questions? <a href="#faq">See FAQ</a></p>
                </div>
            </div>
        </section>
    )
}
