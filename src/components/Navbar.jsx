import { useState, useEffect } from 'react'
import { Menu, X, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Navbar.css'

const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Services', href: '#services' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    return (
        <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
            <div className="container navbar__inner">
                {/* Logo */}
                <a href="#home" className="navbar__logo">
                    <div className="navbar__logo-icon">
                        <Zap size={18} fill="white" color="white" />
                    </div>
                    <span>Hiredlogic</span>
                </a>

                {/* Desktop Nav */}
                <nav className="navbar__links">
                    {navLinks.map(link => (
                        <a key={link.href} href={link.href} className="navbar__link">
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* CTA */}
                <div className="navbar__actions">
                    <Link to="/login" className="btn btn-primary btn-sm">
                        Get Started
                    </Link>
                    <button
                        className="navbar__hamburger"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`}>
                {navLinks.map(link => (
                    <a
                        key={link.href}
                        href={link.href}
                        className="navbar__mobile-link"
                        onClick={() => setMenuOpen(false)}
                    >
                        {link.label}
                    </a>
                ))}
                <Link
                    to="/login"
                    className="btn btn-primary"
                    onClick={() => setMenuOpen(false)}
                    style={{ marginTop: '8px' }}
                >
                    Get Started
                </Link>
            </div>
        </header>
    )
}
