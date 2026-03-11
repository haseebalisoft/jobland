import { useState, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import api, { setAccessToken } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function SetPassword() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { setUser } = useAuth()
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')

    const sessionId = useMemo(() => searchParams.get('session_id') || '', [searchParams])
    const useSession = Boolean(sessionId.trim())

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        const password = e.target.password.value
        const confirmPassword = e.target.confirmPassword.value

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const payload = useSession
                ? { session_id: sessionId, password, confirm_password: confirmPassword }
                : { email, password, confirm_password: confirmPassword }
            const endpoint = useSession ? '/auth/set-password-by-session' : '/auth/set-password'
            const res = await api.post(endpoint, payload)

            setAccessToken(res.data.accessToken)
            setUser(res.data.user)
            navigate('/dashboard')
        } catch (err) {
            const message =
                err.response?.data?.message ||
                (Array.isArray(err.response?.data?.errors) && err.response.data.errors[0]?.msg) ||
                'Unable to set password'
            setError(message)
            setLoading(false)
        }
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <Link to="/" style={styles.logo}>
                        <div style={styles.logoIcon}></div>
                        JobLand
                    </Link>
                    <h2 style={styles.title}>Set your password</h2>
                    <p style={styles.subtitle}>
                        Your account was created after a successful payment. Choose a password to access your dashboard.
                    </p>
                </div>

                <form style={styles.form} onSubmit={handleSubmit}>
                    {!useSession && (
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email Address</label>
                            <div style={styles.inputWrapper}>
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
                    )}

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>New Password</label>
                        <div style={styles.inputWrapper}>
                            <Lock size={18} style={styles.inputIcon} />
                            <input type="password" name="password" placeholder="••••••••" style={styles.input} required />
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Confirm Password</label>
                        <div style={styles.inputWrapper}>
                            <Lock size={18} style={styles.inputIcon} />
                            <input type="password" name="confirmPassword" placeholder="••••••••" style={styles.input} required />
                        </div>
                    </div>

                    {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={styles.button}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (
                            <>
                                Set Password <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
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
        maxWidth: '460px',
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
    logoIcon: {
        width: '32px',
        height: '32px',
        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
        borderRadius: '8px',
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
        lineHeight: 1.6,
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
}
