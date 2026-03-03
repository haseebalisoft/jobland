import { ArrowRight, Calendar, CheckCircle, Briefcase, FileText, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Hero.css'

const dashboardImg = '/dashboard-preview.png'

function OutcomePreview() {
    return (
        <div className="hero__dashboard">
            <div className="hero__dashboard-card hero__dashboard-card--cv" style={{ marginBottom: '24px' }}>
                <div className="dashboard-card-header">
                    <FileText size={16} />
                    <span>HiredLogics ATS CV</span>
                    <span className="badge badge-green" style={{ marginLeft: 'auto' }}>98% Match</span>
                </div>
                <div className="cv-preview">
                    <div className="cv-block cv-block--name"></div>
                    <div className="cv-block cv-block--title"></div>
                    <div className="cv-section-label">Core Skills</div>
                    <div className="cv-skills">
                        {['Strategic Search', 'Interviewing', 'Leadership', 'Efficiency'].map(s => (
                            <span key={s} className="cv-skill-tag">{s}</span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="hero__dashboard-row">
                <div className="hero__dashboard-card hero__dashboard-card--stats">
                    <div className="stat-row">
                        <TrendingUp size={24} color="var(--primary)" />
                        <div>
                            <div className="stat-number">6+</div>
                            <div className="stat-label">Interviews Guaranteed</div>
                        </div>
                    </div>
                </div>

                <div className="hero__dashboard-card hero__dashboard-card--apps">
                    <div className="dashboard-card-header">
                        <CheckCircle size={16} color="var(--accent)" />
                        <span>Success Status</span>
                    </div>
                    <div className="hero__status-text">
                        "Your profile is now live with 50+ hiring managers."
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function Hero() {
    return (
        <section id="home" className="hero">
            {/* Background gradient blobs */}
            <div className="hero__bg-blob hero__bg-blob--1" aria-hidden="true"></div>
            <div className="hero__bg-blob hero__bg-blob--2" aria-hidden="true"></div>
            <div className="hero__bg-blob hero__bg-blob--3" aria-hidden="true"></div>

            <div className="container hero__inner">
                {/* Left Content */}
                <div className="hero__content">
                    <div className="hero__badge">
                        <span className="hero__badge-dot"></span>
                        🚀 AI-Powered Job Search · 2,500+ Interviews Secured
                    </div>

                    <h1 className="hero__headline">
                        Land Your Next Job Faster with <span className="gradient-text">HiredLogics</span><br />
                        & Guaranteed Interviews
                    </h1>

                    <p className="hero__subtext">
                        We build your ATS-optimized CV, handle hundreds of job submissions globally,
                        and ensure you land real interviews — so you can focus on nails the hire.
                    </p>

                    <div className="hero__trust">
                        {['ATS-optimized CV', 'Expert Job Submissions', 'Guaranteed Interviews'].map((item, i) => (
                            <div key={i} className="hero__trust-item">
                                <CheckCircle size={16} color="var(--accent)" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>

                    <div className="hero__ctas">
                        <Link to="/signup" className="btn btn-primary btn-lg">
                            Get Started Free
                            <ArrowRight size={18} />
                        </Link>
                        <Link to="/login" className="btn btn-outline btn-lg">
                            Login to Dashboard
                        </Link>
                    </div>

                    <div className="hero__social-proof">
                        <div className="hero__avatars">
                            {['A', 'B', 'C', 'D'].map((l, i) => (
                                <div key={i} className="hero__avatar" style={{ background: ['#4F46E5', '#818CF8', '#22C55E', '#F59E0B'][i] }}>
                                    {l}
                                </div>
                            ))}
                        </div>
                        <div>
                            <div className="hero__stars">★★★★★</div>
                            <div className="hero__rating-text">
                                <strong>2,500+</strong> interviews landed · <strong>4.9/5</strong> rating
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Focused Outcome Visual */}
                <div className="hero__visual">
                    <OutcomePreview />
                </div>
            </div>
        </section>
    )
}
