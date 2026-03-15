import { Link } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import '../index.css'
import { useState } from 'react'
import api from '../services/api.js'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        const value = (e.target.email?.value || email).trim()
        if (!value) {
            setError('Please enter your email address.')
            return
        }
        try {
            await api.post('/auth/forgot-password', { email: value })
            setSent(true)
        } catch (err) {
            setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Something went wrong. Try again.')
        }
    }

    if (sent) {
        return (
            <div className="auth-container" style={styles.container}>
                <div className="auth-card" style={styles.card}>
                    <div style={styles.header}>
                        <Link to="/" style={styles.logo}>
                            <img src="/logo.png" alt="HiredLogics" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
                            <span>HiredLogics</span>
                        </Link>
                        <h2 style={styles.title}>Check your email</h2>
                        <p style={styles.subtitle}>
                            If an account exists with that email, we&apos;ve sent a password reset link. The link expires in 1 hour.
                        </p>
                    </div>
                    <p style={styles.footer}>
                        <Link to="/login" style={styles.link}>Back to sign in</Link>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-container" style={styles.container}>
            <div className="auth-card" style={styles.card}>
                <div style={styles.header}>
                    <Link to="/" style={styles.logo}>
                        <img src="/logo.png" alt="HiredLogics" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
                        <span>HiredLogics</span>
                    </Link>
                    <h2 style={styles.title}>Forgot password?</h2>
                    <p style={styles.subtitle}>Enter your email and we&apos;ll send you a link to reset your password.</p>
                </div>

                <form style={styles.form} onSubmit={handleSubmit}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <div style={styles.inputWrapper}>
                            <Mail size={18} style={styles.inputIcon} />
                            <input
                                type="email"
                                name="email"
                                placeholder="you@example.com"
                                style={styles.input}
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

                    <button type="submit" className="btn btn-primary" style={styles.button}>
                        Send reset link <ArrowRight size={18} />
                    </button>
                </form>

                <p style={styles.footer}>
                    Remember your password? <Link to="/login" style={styles.link}>Sign in</Link>
                </p>
            </div>
        </div>
    )
}

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F0F4FF 0%, #E0E7FF 100%)',
        padding: '24px',
    },
    card: {
        background: 'white',
        padding: '48px',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05)',
        width: '100%',
        maxWidth: '440px',
    },
    header: {
        textAlign: 'center',
        marginBottom: '32px',
    },
    logo: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '24px',
        fontWeight: '800',
        color: 'var(--dark)',
        textDecoration: 'none',
        marginBottom: '24px',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: 'var(--dark)',
        marginBottom: '8px',
    },
    subtitle: {
        color: 'var(--gray)',
        fontSize: '15px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--dark)',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: '16px',
        color: 'var(--gray-light)',
    },
    input: {
        width: '100%',
        padding: '12px 16px 12px 44px',
        border: '1px solid var(--gray-border)',
        borderRadius: '12px',
        fontSize: '15px',
        outline: 'none',
        transition: 'all 0.2s',
    },
    button: {
        width: '100%',
        justifyContent: 'center',
        marginTop: '8px',
        padding: '14px',
        fontSize: '16px',
    },
    footer: {
        textAlign: 'center',
        marginTop: '24px',
        color: 'var(--gray)',
        fontSize: '14px',
    },
    link: {
        color: 'var(--primary)',
        fontWeight: '600',
        textDecoration: 'none',
    },
}
