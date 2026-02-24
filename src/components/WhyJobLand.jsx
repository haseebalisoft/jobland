import { Bot, UserCheck, Clock, TrendingUp, DollarSign, Globe } from 'lucide-react'
import './WhyJobLand.css'

const reasons = [
    {
        icon: Bot,
        title: 'AI-Powered Applications',
        description: 'Our AI applies to the right jobs at the right time — 20–50 applications daily, perfectly tailored to your profile.',
    },
    {
        icon: UserCheck,
        title: 'Human-Verified Process',
        description: 'Every CV and application is reviewed by our expert team to ensure quality, accuracy, and maximum impact.',
    },
    {
        icon: Clock,
        title: 'Save 100+ Hours',
        description: 'Stop spending 5+ hours daily on job portals. We automate the entire application process so you focus on interviews.',
    },
    {
        icon: TrendingUp,
        title: 'High Interview Success Rate',
        description: '78% of our clients land interviews within 2 weeks. Our data-driven approach gets you noticed.',
    },
    {
        icon: DollarSign,
        title: 'Affordable Pricing',
        description: 'At $30/month, it\'s less than a coffee per day. Or only pay $100 when you actually get an interview.',
    },
    {
        icon: Globe,
        title: 'Global Job Coverage',
        description: 'We apply to jobs worldwide — USA, UK, Canada, Europe, UAE, and beyond. Remote and onsite roles covered.',
    },
]

const stats = [
    { value: '2,500+', label: 'Interviews Secured' },
    { value: '98%', label: 'Client Satisfaction' },
    { value: '50+', label: 'Job Platforms' },
    { value: '14 days', label: 'Avg. First Interview' },
]

export default function WhyJobLand() {
    return (
        <section className="why-section section">
            <div className="container">
                {/* Stats row */}
                <div className="why-stats">
                    {stats.map((s, i) => (
                        <div key={i} className="why-stat">
                            <div className="why-stat-value gradient-text">{s.value}</div>
                            <div className="why-stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="why-inner">
                    <div className="why-left">
                        <div className="section-label">🏆 Why JobLand?</div>
                        <h2 className="section-title">Built for Job Seekers Who<br />Mean Business</h2>
                        <p className="section-subtitle" style={{ marginBottom: '32px' }}>
                            We're not just another job board. We're your personal AI-powered job search team, working around the clock to land you interviews.
                        </p>
                        <a href="#intake-form" className="btn btn-primary btn-lg">
                            Start Your Job Search
                        </a>
                    </div>

                    <div className="why-right">
                        {reasons.map((r, i) => {
                            const Icon = r.icon
                            return (
                                <div key={i} className="why-reason">
                                    <div className="why-reason-icon">
                                        <Icon size={20} color="var(--primary)" />
                                    </div>
                                    <div>
                                        <h4 className="why-reason-title">{r.title}</h4>
                                        <p className="why-reason-desc">{r.description}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </section>
    )
}
