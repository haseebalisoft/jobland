import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import '../index.css' // Import global css if needed

export default function Login() {
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        // Mock existing user object based on given instructions
        const user = {
            name: "John",
            email: e.target.email.value
        };

        // Prevent duplicate messages by checking session
        if (!sessionStorage.getItem('welcomeSent')) {
            try {
                console.log("Sending welcome email request to backend...");
                const response = await fetch('http://localhost:5000/api/send-welcome', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: user.name, email: user.email })
                });

                if (response.ok) {
                    console.log("Email request successful.");
                    sessionStorage.setItem('welcomeSent', 'true');
                } else {
                    console.error("Failed to send email. Backend returned status:", response.status);
                }
            } catch (err) {
                console.error("Failed to make welcome email API request", err);
            }
        }

        navigate('/dashboard');
    };

    return (
        <div className="auth-container" style={styles.container}>
            <div className="auth-card" style={styles.card}>
                <div style={styles.header}>
                    <Link to="/" style={styles.logo}>
                        <div style={styles.logoIcon}></div>
                        JobLand
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
                            <a href="#" style={styles.forgot}>Forgot password?</a>
                        </div>
                        <div style={styles.inputWrapper}>
                            <Lock size={18} style={styles.inputIcon} />
                            <input type="password" placeholder="••••••••" style={styles.input} required />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={styles.button}>
                        Sign in <ArrowRight size={18} />
                    </button>
                </form>

                <p style={styles.footer}>
                    Don't have an account? <Link to="/signup" style={styles.link}>Sign up</Link>
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
    forgot: {
        fontSize: '13px',
        color: 'var(--primary)',
        textDecoration: 'none',
        fontWeight: '600',
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
