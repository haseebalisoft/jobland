import { Link, useLocation } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import api from '../services/api.js'

export default function Signup() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const plan = queryParams.get('plan');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const full_name = e.target.name.value;
        const email = e.target.email.value;
        const password = e.target.password.value;
        const confirmPassword = e.target.confirmPassword.value;

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            await api.post('/auth/signup', {
                full_name,
                email,
                password,
                confirm_password: confirmPassword,
            });
            if (plan) {
                localStorage.setItem('selectedPlanName', plan);
            }
            setSuccess('Account created. Please check your email to verify your account before logging in.');
        } catch (err) {
            const message =
                err.response?.data?.message ||
                (Array.isArray(err.response?.data?.errors) && err.response.data.errors[0]?.msg) ||
                'Signup failed';
            setError(message);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <Link to="/" style={styles.logo}>
                        <div style={styles.logoIcon}></div>
                        Hiredlogic
                    </Link>
                    <h2 style={styles.title}>Create your account</h2>
                    {plan ? (
                        <p style={styles.subtitle}>You're signing up for the <strong>{plan}</strong>.</p>
                    ) : (
                        <p style={styles.subtitle}>Join thousands of successful job seekers</p>
                    )}
                </div>

                <form style={styles.form} onSubmit={handleSignup}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Full Name</label>
                        <div style={styles.inputWrapper}>
                            <User size={18} style={styles.inputIcon} />
                            <input type="text" name="name" placeholder="John Doe" style={styles.input} required />
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <div style={styles.inputWrapper}>
                            <Mail size={18} style={styles.inputIcon} />
                            <input type="email" name="email" placeholder="you@example.com" style={styles.input} required />
                        </div>
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
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
                    {success && <p style={{ color: 'green', fontSize: '14px' }}>{success}</p>}

                    <button type="submit" className="btn btn-primary" style={styles.button}>
                        Sign up <ArrowRight size={18} />
                    </button>
                </form>

                <p style={styles.footer}>
                    Already have an account? <Link to="/login" style={styles.link}>Sign in</Link>
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
