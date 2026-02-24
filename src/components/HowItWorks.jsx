import { FileText, Bot, Calendar } from 'lucide-react'
import './HowItWorks.css'

const steps = [
    {
        number: '01',
        icon: FileText,
        title: 'We Build Your CV',
        description: 'Our experts craft a professional, ATS-optimized CV tailored to your industry and target roles. Keyword-rich and interview-ready.',
        color: '#4F46E5',
        bg: '#EEF2FF',
    },
    {
        number: '02',
        icon: Bot,
        title: 'We Apply Using AI',
        description: 'Our AI engine auto-applies to hundreds of matching jobs daily across LinkedIn, Indeed, Greenhouse, and 50+ platforms — 24/7.',
        color: '#22C55E',
        bg: '#DCFCE7',
    },
    {
        number: '03',
        icon: Calendar,
        title: 'You Get Interviews',
        description: 'Sit back as interview invitations land in your inbox. We also prep you with mock sessions and company-specific coaching.',
        color: '#F59E0B',
        bg: '#FEF3C7',
    },
]

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="hiw-section section">
            <div className="container">
                <div className="text-center">
                    <div className="section-label">✨ The Process</div>
                    <h2 className="section-title">How JobLand Works</h2>
                    <p className="section-subtitle">
                        Three simple steps. Zero stress. Real interviews.
                    </p>
                </div>

                <div className="hiw-cards">
                    {steps.map((step, i) => {
                        const Icon = step.icon
                        return (
                            <div key={i} className="hiw-card">
                                <div className="hiw-connector" aria-hidden="true" />
                                <div className="hiw-number" style={{ color: step.color }}>{step.number}</div>
                                <div className="hiw-icon-wrap" style={{ background: step.bg }}>
                                    <Icon size={28} color={step.color} strokeWidth={1.75} />
                                </div>
                                <h3 className="hiw-title">{step.title}</h3>
                                <p className="hiw-desc">{step.description}</p>
                                <div className="hiw-pill" style={{ background: step.bg, color: step.color }}>
                                    Step {i + 1}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Bottom CTA */}
                <div className="hiw-cta">
                    <p className="hiw-cta-text">Ready to get started? It takes less than 5 minutes to sign up.</p>
                    <a href="#intake-form" className="btn btn-primary btn-lg">
                        Start Now — It's Free
                    </a>
                </div>
            </div>
        </section>
    )
}
