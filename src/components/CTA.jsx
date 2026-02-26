import { ArrowRight, Phone } from 'lucide-react'
import './CTA.css'

export default function CTA() {
    return (
        <section className="cta-section section">
            <div className="container">
                <div className="cta-card">
                    {/* Decorative blobs */}
                    <div className="cta-blob cta-blob--1" aria-hidden="true" />
                    <div className="cta-blob cta-blob--2" aria-hidden="true" />

                    <div className="cta-content">
                        <div className="cta-badge">🎯 Limited spots available this week</div>
                        <h2 className="cta-headline">
                            Ready to Land Your Next Job?
                        </h2>
                        <p className="cta-subtext">
                            Join 2,500+ job seekers who used HiredLogics to get real interviews at top companies.
                            Your next opportunity is one click away.
                        </p>

                        <div className="cta-buttons">
                            <a href="#intake-form" className="btn btn-lg cta-btn-primary">
                                Get Started Now
                                <ArrowRight size={18} />
                            </a>
                            <a href="tel:+1234567890" className="btn btn-lg cta-btn-secondary">
                                <Phone size={16} />
                                Book Free Call
                            </a>
                        </div>

                        <div className="cta-trust">
                            <span>✓ No credit card required</span>
                            <span>•</span>
                            <span>✓ Cancel anytime</span>
                            <span>•</span>
                            <span>✓ Results in 14 days</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
