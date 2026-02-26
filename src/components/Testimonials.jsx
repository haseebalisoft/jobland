import { Star, Quote } from 'lucide-react'
import './Testimonials.css'

const testimonials = [
    {
        name: 'Sarah Johnson',
        role: 'Landed: Senior Product Manager at Google',
        location: 'San Francisco, USA',
        quote: 'HiredLogics found me 3 interviews in less than 2 weeks. The ATS CV they created was miles above what I had before. I got my dream job at Google — I couldn\'t believe it!',
        initials: 'SJ',
        color: '#4F46E5',
        stars: 5,
    },
    {
        name: 'Ahmed Hassan',
        role: 'Landed: Software Engineer at Stripe',
        location: 'London, UK → Remote',
        quote: 'As an international applicant, I thought getting a remote role at a US company was impossible. HiredLogics\' AI applied to 400+ jobs and I got 8 interviews. Stripe offered me the job!',
        initials: 'AH',
        color: '#22C55E',
        stars: 5,
    },
    {
        name: 'Priya Sharma',
        role: 'Landed: UX Designer at Airbnb',
        location: 'Bangalore, India',
        quote: 'The interview prep sessions were incredible. I knew exactly what to expect and how to present my work. Got the offer in 3 weeks flat. Worth every single penny.',
        initials: 'PS',
        color: '#F59E0B',
        stars: 5,
    },
    {
        name: 'Marcus Williams',
        role: 'Landed: Data Scientist at Netflix',
        location: 'New York, USA',
        quote: 'I was applying manually for 6 months with no results. HiredLogics took over and within 3 weeks I had 5 interviews. Netflix hired me within a month. Absolutely insane results.',
        initials: 'MW',
        color: '#EC4899',
        stars: 5,
    },
]

export default function Testimonials() {
    return (
        <section className="testimonials-section section">
            <div className="container">
                <div className="text-center">
                    <div className="section-label">❤️ Success Stories</div>
                    <h2 className="section-title">Real People, Real Interviews,<br />Real Jobs</h2>
                    <p className="section-subtitle">
                        Don't take our word for it — hear from the 2,500+ job seekers who've landed their dream roles with HiredLogics.
                    </p>
                </div>

                <div className="testimonials-grid">
                    {testimonials.map((t, i) => (
                        <div key={i} className="testimonial-card">
                            <div className="testimonial-quote-icon">
                                <Quote size={16} fill="currentColor" color="var(--primary)" />
                            </div>

                            <div className="testimonial-stars">
                                {Array.from({ length: t.stars }).map((_, j) => (
                                    <Star key={j} size={14} fill="#F59E0B" color="#F59E0B" />
                                ))}
                            </div>

                            <p className="testimonial-text">"{t.quote}"</p>

                            <div className="testimonial-author">
                                <div className="testimonial-avatar" style={{ background: t.color }}>
                                    {t.initials}
                                </div>
                                <div>
                                    <div className="testimonial-name">{t.name}</div>
                                    <div className="testimonial-role">{t.role}</div>
                                    <div className="testimonial-location">{t.location}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
