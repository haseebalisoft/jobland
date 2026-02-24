import { FileText, Bot, Shield, LayoutDashboard, GraduationCap } from 'lucide-react'
import './Services.css'

const services = [
    {
        icon: FileText,
        title: 'ATS CV Creation',
        description: 'We craft an ATS-optimized, keyword-rich resume that passes automated filters and impresses recruiters at top companies.',
        color: '#4F46E5',
        bg: '#EEF2FF',
        tag: 'Most Requested',
    },
    {
        icon: Bot,
        title: 'AI Job Auto Apply',
        description: 'Our AI applies to 20–50 jobs per day on your behalf across LinkedIn, Indeed, Workday, and 50+ platforms — while you sleep.',
        color: '#22C55E',
        bg: '#DCFCE7',
        tag: 'AI Powered',
    },
    {
        icon: Shield,
        title: 'Interview Guarantee',
        description: 'Pay only when you land an interview. Zero risk, maximum accountability. We\'re invested in your success as much as you are.',
        color: '#F59E0B',
        bg: '#FEF3C7',
        tag: 'Pay Per Result',
    },
    {
        icon: LayoutDashboard,
        title: 'Job Tracking Dashboard',
        description: 'A real-time dashboard showing every application, its status, interview dates, and follow-up reminders — all in one place.',
        color: '#8B5CF6',
        bg: '#F5F3FF',
        tag: 'Real-time',
    },
    {
        icon: GraduationCap,
        title: 'Interview Preparation',
        description: 'Company-specific mock interviews, behavioral coaching, and salary negotiation tactics to help you nail every interview.',
        color: '#EC4899',
        bg: '#FDF2F8',
        tag: 'Expert Coached',
    },
]

export default function Services() {
    return (
        <section id="services" className="services-section section">
            <div className="container">
                <div className="services-header">
                    <div>
                        <div className="section-label">💼 Our Services</div>
                        <h2 className="section-title">Everything You Need to<br />Land Your Dream Job</h2>
                    </div>
                    <p className="section-subtitle" style={{ maxWidth: '380px', alignSelf: 'flex-end' }}>
                        A complete end-to-end job search solution — from CV creation to interview success.
                    </p>
                </div>

                <div className="services-grid">
                    {services.map((svc, i) => {
                        const Icon = svc.icon
                        return (
                            <div key={i} className={`service-card ${i === 0 ? 'service-card--featured' : ''}`}>
                                <div className="service-card-top">
                                    <div className="service-icon-wrap" style={{ background: svc.bg }}>
                                        <Icon size={24} color={svc.color} strokeWidth={1.75} />
                                    </div>
                                    {svc.tag && (
                                        <span className="service-tag" style={{ background: svc.bg, color: svc.color }}>
                                            {svc.tag}
                                        </span>
                                    )}
                                </div>
                                <h3 className="service-title">{svc.title}</h3>
                                <p className="service-desc">{svc.description}</p>
                                <a href="#intake-form" className="service-cta" style={{ color: svc.color }}>
                                    Get Started →
                                </a>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
