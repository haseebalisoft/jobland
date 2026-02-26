import { Zap, Twitter, Linkedin, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react'
import './Footer.css'

const footerLinks = {
    Product: [
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Services', href: '#services' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Dashboard', href: '#' },
    ],
    Company: [
        { label: 'About Us', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Press', href: '#' },
    ],
    Legal: [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Terms of Service', href: '#' },
        { label: 'Cookie Policy', href: '#' },
        { label: 'Refund Policy', href: '#' },
    ],
}

const socials = [
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Youtube, href: '#', label: 'YouTube' },
]

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-main">
                    {/* Brand column */}
                    <div className="footer-brand">
                        <a href="#home" className="footer-logo">
                            <div className="footer-logo-icon">
                                <Zap size={16} fill="white" color="white" />
                            </div>
                            <span>HiredLogics</span>
                        </a>
                        <p className="footer-tagline">
                            AI-powered job search that gets you real interviews. We build your CV, apply to jobs, and help you land your dream role.
                        </p>

                        <div className="footer-contact">
                            <div className="footer-contact-item">
                                <Mail size={14} />
                                <a href="mailto:hello@hiredlogics.com">hello@hiredlogics.com</a>
                            </div>
                            <div className="footer-contact-item">
                                <Phone size={14} />
                                <a href="tel:+1234567890">+1 (234) 567-890</a>
                            </div>
                            <div className="footer-contact-item">
                                <MapPin size={14} />
                                <span>Remote-first · Serving worldwide</span>
                            </div>
                        </div>

                        <div className="footer-socials">
                            {socials.map((s, i) => {
                                const Icon = s.icon
                                return (
                                    <a key={i} href={s.href} className="footer-social" aria-label={s.label}>
                                        <Icon size={16} />
                                    </a>
                                )
                            })}
                        </div>
                    </div>

                    {/* Links columns */}
                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category} className="footer-col">
                            <h4 className="footer-col-title">{category}</h4>
                            <ul className="footer-col-links">
                                {links.map((link, i) => (
                                    <li key={i}>
                                        <a href={link.href} className="footer-link">{link.label}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="footer-bottom">
                    <p className="footer-copy">© 2026 HiredLogics. All rights reserved. Built with ❤️ for job seekers worldwide.</p>
                    <div className="footer-bottom-links">
                        <a href="#" className="footer-link">Privacy</a>
                        <a href="#" className="footer-link">Terms</a>
                        <a href="#" className="footer-link">Sitemap</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
