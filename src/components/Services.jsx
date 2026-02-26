import { FileText, Shield, Globe } from 'lucide-react'
import './Services.css'

const services = [
    {
        icon: FileText,
        title: 'ATS CV Creation',
        description: 'Our core service. We craft a professional, keyword-rich CV designed to pass modern ATS filters and catch the eye of top recruiters.',
        color: '#4F46E5',
        bg: '#EEF2FF',
        tag: 'Essential',
    },
    {
        icon: Shield,
        title: 'Interview Guarantee',
        description: 'Our signature guarantee. Choose your package and we ensure you land 1, 3, or 6 interviews. We focus on results, not just effort.',
        color: '#F59E0B',
        bg: '#FEF3C7',
        tag: 'Outcome Based',
    },
    {
        icon: Globe,
        title: 'Expert Job Submissions',
        description: 'Our team manually submits your profile to high-potential roles globally, ensuring your CV reaches the right hiring managers.',
        color: '#22C55E',
        bg: '#DCFCE7',
        tag: 'Global Reach',
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
