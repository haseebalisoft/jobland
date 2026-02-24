import { ArrowRight, Calendar, CheckCircle, Briefcase, FileText, TrendingUp } from 'lucide-react'
import './Hero.css'

const dashboardImg = '/dashboard-preview.png'

function DashboardPreview() {
    return (
        <div className="hero__dashboard">
            <div className="hero__dashboard-card hero__dashboard-card--apps">
                <div className="dashboard-card-header">
                    <Briefcase size={16} />
                    <span>Recent Applications</span>
                    <span className="badge badge-green" style={{ marginLeft: 'auto' }}>+12 today</span>
                </div>
                <div className="dashboard-job-list">
                    {[
                        { company: 'Google', role: 'SWE', status: 'Applied', color: 'blue' },
                        { company: 'Stripe', role: 'PM', status: 'Interview', color: 'green' },
                        { company: 'Airbnb', role: 'Designer', status: 'Offered', color: 'green' },
                        { company: 'Netflix', role: 'Analyst', status: 'Applied', color: 'blue' },
                    ].map((job, i) => (
                        <div key={i} className="dashboard-job-row">
                            <div className="dashboard-job-logo">{job.company[0]}</div>
                            <div className="dashboard-job-info">
                                <div className="dashboard-job-company">{job.company}</div>
                                <div className="dashboard-job-role">{job.role}</div>
                            </div>
                            <span className={`badge badge-${job.color}`}>{job.status}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="hero__dashboard-row">
                <div className="hero__dashboard-card hero__dashboard-card--stats">
                    <div className="stat-row">
                        <TrendingUp size={20} color="var(--primary)" />
                        <div>
                            <div className="stat-number">247</div>
                            <div className="stat-label">Jobs Applied</div>
                        </div>
                    </div>
                    <div className="stat-row">
                        <CheckCircle size={20} color="var(--accent)" />
                        <div>
                            <div className="stat-number">14</div>
                            <div className="stat-label">Interviews</div>
                        </div>
                    </div>
                </div>

                <div className="hero__dashboard-card hero__dashboard-card--interview">
                    <div className="dashboard-card-header">
                        <Calendar size={16} />
                        <span>Next Interview</span>
                    </div>
                    <div className="interview-company">Stripe Inc.</div>
                    <div className="interview-role">Product Manager</div>
                    <div className="interview-time">Tomorrow, 10:00 AM GMT</div>
                    <div className="interview-prep-bar">
                        <div className="interview-prep-label">
                            <span>Prep Progress</span>
                            <span>78%</span>
                        </div>
                        <div className="progress-track">
                            <div className="progress-fill" style={{ width: '78%' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="hero__dashboard-card hero__dashboard-card--cv">
                <div className="dashboard-card-header">
                    <FileText size={16} />
                    <span>ATS CV Builder</span>
                    <span className="badge badge-green" style={{ marginLeft: 'auto' }}>96% Score</span>
                </div>
                <div className="cv-preview">
                    <div className="cv-block cv-block--name"></div>
                    <div className="cv-block cv-block--title"></div>
                    <div className="cv-section-label">Experience</div>
                    <div className="cv-block cv-block--line"></div>
                    <div className="cv-block cv-block--line-short"></div>
                    <div className="cv-section-label">Skills</div>
                    <div className="cv-skills">
                        {['React', 'Node.js', 'Python', 'AWS'].map(s => (
                            <span key={s} className="cv-skill-tag">{s}</span>
                        ))}
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
                        Land Your Next Job<br />
                        <span className="gradient-text">Faster with Guaranteed</span><br />
                        Interviews
                    </h1>

                    <p className="hero__subtext">
                        We build your ATS-optimized CV, apply to hundreds of jobs using AI,
                        and help you secure real interviews — so you can focus on what matters.
                    </p>

                    <div className="hero__trust">
                        {['ATS-optimized CV', 'AI Auto Apply', 'Guaranteed Interviews'].map((item, i) => (
                            <div key={i} className="hero__trust-item">
                                <CheckCircle size={16} color="var(--accent)" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>

                    <div className="hero__ctas">
                        <a href="#intake-form" className="btn btn-primary btn-lg">
                            Get Started Free
                            <ArrowRight size={18} />
                        </a>
                        <a href="#intake-form" className="btn btn-outline btn-lg">
                            Book Free Consultation
                        </a>
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

                {/* Right: Dashboard Preview */}
                <div className="hero__visual">
                    <DashboardPreview />
                </div>
            </div>
        </section>
    )
}
