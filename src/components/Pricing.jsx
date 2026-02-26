import { Check, Zap, Star } from 'lucide-react'
import './Pricing.css'

const plans = [
    {
        name: 'Resume Only',
        price: '$15',
        period: 'one-time',
        description: 'Professional ATS-optimized CV crafted by experts.',
        features: [
            'ATS-optimized CV',
            'Professional Formatting',
            'Keyword Optimization',
            '24h Delivery',
        ],
        cta: 'Get Resume',
        popular: false,
        color: 'var(--dark)',
        bg: 'var(--white)',
    },
    {
        name: 'Basic Pack',
        price: '$30',
        period: '1 interview',
        description: 'Perfect for a quick start. Includes 20% discount.',
        features: [
            '1 Guaranteed Interview',
            'ATS CV Included',
            'AI Auto-Apply',
            'Job Tracking',
        ],
        cta: 'Get Started',
        popular: false,
        color: 'var(--dark)',
        bg: 'var(--white)',
    },
    {
        name: 'Success Pack',
        price: '$60',
        period: '3 interviews',
        description: 'Our most popular choice. Includes 40% discount.',
        features: [
            '3 Guaranteed Interviews',
            'Priority AI Applications',
            'Interview Preparation',
            'Real-time Dashboard',
        ],
        cta: 'Landed Interviews',
        popular: true,
        color: 'white',
        bg: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    },
    {
        name: 'VIP Executive',
        price: '$100',
        period: '6 interviews',
        description: 'Full white-glove service. Best value for serious growth.',
        features: [
            '6 Guaranteed Interviews',
            'Dedicated Career Coach',
            'Unlimited Applications',
            'Lifetime Dashboard',
        ],
        cta: 'Go VIP',
        popular: false,
        color: 'var(--dark)',
        bg: 'var(--white)',
    },
]

export default function Pricing() {
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
                                <div className="pricing-price-row">
                                    <span className="pricing-price" style={{ color: plan.color }}>{plan.price}</span>
                                    <span className="pricing-period" style={{ color: plan.popular ? 'rgba(255,255,255,0.65)' : 'var(--gray)' }}>
                                        / {plan.period}
                                    </span>
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

                            <a
                                href="#intake-form"
                                className={`btn btn-lg pricing-cta ${plan.popular ? 'pricing-cta--inverted' : 'btn-primary'}`}
                            >
                                <Zap size={16} fill={plan.popular ? '#4F46E5' : 'white'} />
                                {plan.cta}
                            </a>
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
