import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, ArrowRight } from 'lucide-react'
import '../index.css'
import './Auth.css'
import { useState, useMemo } from 'react'
import api, { setAccessToken } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function ResetPassword() {
    const navigate = useNavigate()
    const { setUser } = useAuth()
    const [searchParams] = useSearchParams()
    const token = useMemo(() => searchParams.get('token') || '', [searchParams])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        const password = e.target.password.value
        const confirmPassword = e.target.confirmPassword.value
        if (password.length < 6) {
            setError('Password must be at least 6 characters.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }
        if (!token) {
            setError('Invalid or missing reset link. Request a new one from the login page.')
            return
        }
        setLoading(true)
        try {
            const res = await api.post('/auth/reset-password', {
                token,
                password,
                confirm_password: confirmPassword,
            })
            setAccessToken(res.data.accessToken)
            setUser(res.data.user)
            const user = res.data.user
            if (user.role === 'bd' || user.role === 'admin') {
                navigate('/bd')
                return
            }
            if (user.isActive) {
                navigate('/dashboard')
            } else {
                navigate('/checkout')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired link. Request a new password reset.')
            setLoading(false)
        }
    }

    if (!token) {
        return (
            <div className="auth-container" style={styles.container}>
                <div className="auth-card" style={styles.card}>
                    <div style={styles.header}>
                        <Link to="/" style={styles.logo}>
                            <img src="/logo.png" alt="HiredLogics" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
                            <span>HiredLogics</span>
                        </Link>
                        <h2 style={styles.title}>Invalid link</h2>
                        <p style={styles.subtitle}>This reset link is missing or invalid. Request a new one from the login page.</p>
                    </div>
                    <p style={styles.footer}>
                        <Link to="/forgot-password" style={styles.link}>Forgot password</Link>
                        {' · '}
                        <Link to="/login" style={styles.link}>Sign in</Link>
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
                    <h2 style={styles.title}>Set new password</h2>
                    <p style={styles.subtitle}>Enter your new password below.</p>
                </div>

                <form style={styles.form} onSubmit={handleSubmit}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>New password</label>
                        <div style={styles.inputWrapper}>
                            <Lock size={18} style={styles.inputIcon} />
                            <input
                                type="password"
                                name="password"
                                placeholder="Min 6 characters"
                                style={styles.input}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Confirm password</label>
                        <div style={styles.inputWrapper}>
                            <Lock size={18} style={styles.inputIcon} />
                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Re-enter password"
                                style={styles.input}
                                required
                                minLength={6}
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    {error && <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>}

                    <button type="submit" className="btn btn-primary" style={styles.button} disabled={loading}>
                        {loading ? 'Saving…' : 'Reset password'} {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <p style={styles.footer}>
                    <Link to="/login" style={styles.link}>Back to sign in</Link>
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
