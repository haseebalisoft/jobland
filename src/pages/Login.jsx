import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import '../index.css'
import './Auth.css'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        const email = e.target.email.value;
        const password = e.target.password.value;

        try {
            const loggedInUser = await login(email, password);

            // BD or Admin → always go to BD portal (leads dashboard)
            if (loggedInUser.role === 'bd' || loggedInUser.role === 'admin') {
                navigate('/bd');
                return;
            }

            if (!loggedInUser.isActive) {
                // No active subscription: send logged-in users to account-bound billing flow.
                navigate('/billing');
            } else {
                const free =
                    String(loggedInUser.subscription_plan || 'free').toLowerCase() === 'free';
                navigate(free ? '/free-tools' : '/dashboard');
                return;
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="auth-container" style={styles.container}>
            <div className="auth-card" style={styles.card}>
                <div style={styles.header}>
                    <Link to="/" style={styles.logo}>
                        <img src="/logo.png" alt="HiredLogics" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
                        <span>HiredLogics</span>
                    </Link>
                    <h2 style={styles.title}>Welcome back</h2>
                    <p style={styles.subtitle}>Enter your details to access your dashboard</p>
                </div>

                <form style={styles.form} onSubmit={handleLogin}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <div style={styles.inputWrapper}>
                            <Mail size={18} style={styles.inputIcon} />
                            <input type="email" name="email" placeholder="you@example.com" style={styles.input} required />
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label style={styles.label}>Password</label>
                            <Link to="/forgot-password" style={styles.forgot}>Forgot password?</Link>
                        </div>
                        <div style={styles.inputWrapper}>
                            <Lock size={18} style={styles.inputIcon} />
                            <input type="password" name="password" placeholder="••••••••" style={styles.input} required />
                        </div>
                    </div>

                    {error && <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>}

                    <button type="submit" className="btn btn-primary" style={styles.button}>
                        Sign in <ArrowRight size={18} />
                    </button>
                </form>

                <p style={styles.footer}>
                    Don't have an account? <Link to="/#pricing" style={styles.link}>View pricing & get started</Link>
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
    forgot: {
        fontSize: '13px',
        color: theme.primary,
        textDecoration: 'none',
        fontWeight: '600',
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
