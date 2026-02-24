import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './FAQ.css'

const faqs = [
    {
        q: 'Do you guarantee a job?',
        a: 'We guarantee interviews, not jobs — because ultimately your performance in the interview determines the outcome. However, our interview preparation coaching significantly boosts your chances of converting those interviews into offers. Our clients have a 78% interview-to-offer rate.',
    },
    {
        q: 'How many jobs do you apply to daily?',
        a: 'On the Pro plan, we apply to 20–50 jobs per day based on your preferences. You can configure the daily job count and we\'ll focus on roles that match your target role, experience level, and location preferences.',
    },
    {
        q: 'Can I cancel anytime?',
        a: 'Yes! With the Pro Subscription, you can cancel anytime with no penalties or hidden fees. Your subscription continues until the end of the billing period. For Pay Per Interview, there\'s no ongoing commitment — you simply pay per interview secured.',
    },
    {
        q: 'Do you support international jobs and remote roles?',
        a: 'Absolutely. We cover job platforms in USA, UK, Canada, Europe, UAE, Australia, and more. We apply to both remote and onsite positions worldwide, making us ideal for international applicants and digital nomads.',
    },
    {
        q: 'How long does it take to get my first interview?',
        a: 'Most clients start receiving interview invitations within 7–14 days of signing up. The exact timeline depends on your industry, experience level, and target roles. We\'ve had clients land interviews as fast as 3 days.',
    },
    {
        q: 'What job platforms do you apply to?',
        a: 'We apply across 50+ platforms including LinkedIn, Indeed, Glassdoor, Workday, Greenhouse, Lever, SmartRecruiters, AngelList, and many company career pages directly. Our system adapts to new platforms regularly.',
    },
    {
        q: 'Do I need to have a CV already?',
        a: 'No! Our ATS CV creation service is included in both plans. You just fill out our intake form with your experience and preferences, and our team will build you a professional, ATS-optimized CV from scratch.',
    },
]

export default function FAQ() {
    const [open, setOpen] = useState(null)
    const toggle = (i) => setOpen(open === i ? null : i)

    return (
        <section id="faq" className="faq-section section">
            <div className="container">
                <div className="faq-inner">
                    <div className="faq-left">
                        <div className="section-label">❓ FAQ</div>
                        <h2 className="section-title">Frequently Asked Questions</h2>
                        <p className="section-subtitle" style={{ marginBottom: '32px' }}>
                            Everything you need to know about JobLand. Can't find your answer?
                        </p>
                        <a href="mailto:hello@jobland.io" className="btn btn-outline">
                            Contact Support
                        </a>
                    </div>

                    <div className="faq-right">
                        {faqs.map((item, i) => (
                            <div
                                key={i}
                                className={`faq-item ${open === i ? 'faq-item--open' : ''}`}
                            >
                                <button
                                    className="faq-question"
                                    onClick={() => toggle(i)}
                                    aria-expanded={open === i}
                                >
                                    <span>{item.q}</span>
                                    <ChevronDown
                                        size={20}
                                        className="faq-chevron"
                                        style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                    />
                                </button>
                                <div
                                    className="faq-answer"
                                    style={{ maxHeight: open === i ? '300px' : '0' }}
                                >
                                    <p>{item.a}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
