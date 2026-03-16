import { Link } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import '../index.css'
import './Auth.css'
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

                    {error && <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>}

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

const theme = { primary: '#2563EB', dark: '#0F172A', muted: '#64748B', border: '#E2E8F0' }
const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #EFF6FF 0%, #DBEAFE 40%, #F8FAFC 100%)',
        padding: '24px',
    },
    card: {
        background: 'white',
        padding: '48px 40px',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(37, 99, 235, 0.10)',
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
        gap: '10px',
        fontSize: '24px',
        fontWeight: '800',
        color: theme.dark,
        textDecoration: 'none',
        marginBottom: '24px',
        letterSpacing: '-0.02em',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: theme.dark,
        marginBottom: '8px',
        letterSpacing: '-0.02em',
    },
    subtitle: {
        color: theme.muted,
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
        color: theme.dark,
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: '16px',
        color: theme.muted,
    },
    input: {
        width: '100%',
        padding: '14px 16px 14px 44px',
        border: `1px solid ${theme.border}`,
        borderRadius: '14px',
        fontSize: '15px',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    button: {
        width: '100%',
        justifyContent: 'center',
        marginTop: '8px',
        padding: '14px 20px',
        fontSize: '16px',
        borderRadius: '14px',
    },
    footer: {
        textAlign: 'center',
        marginTop: '24px',
        color: theme.muted,
        fontSize: '14px',
    },
    link: {
        color: theme.primary,
        fontWeight: '600',
        textDecoration: 'none',
    },
}
