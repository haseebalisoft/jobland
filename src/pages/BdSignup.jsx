import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import '../index.css'
import { useState } from 'react'
import api from '../services/api.js'

export default function BdSignup() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    const email = e.target.email.value
    const password = e.target.password.value
    const confirm_password = e.target.confirm_password.value

    if (password !== confirm_password) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      await api.post('/auth/bd/signup', { email, password, confirm_password })
      setSuccess(true)
      setTimeout(() => navigate('/bd/login'), 1500)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Signup failed')
    }
  }

  return (
    <div className="auth-container" style={styles.container}>
      <div className="auth-card" style={styles.card}>
        <div style={styles.header}>
          <Link to="/" style={styles.logo}>
            <div style={styles.logoIcon}></div>
            HiredLogics · BD Portal
          </Link>
          <div style={styles.badge}>BD only</div>
          <h2 style={styles.title}>Create BD account</h2>
          <p style={styles.subtitle}>Sign up with email and password. Stored in the backend.</p>
        </div>

        {success ? (
          <p style={styles.success}>Account created. Redirecting to sign in...</p>
        ) : (
          <form style={styles.form} onSubmit={handleSignup}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input type="email" name="email" placeholder="bd@company.com" style={styles.input} required />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password (min 6 characters)</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input type="password" name="password" placeholder="••••••••" style={styles.input} required minLength={6} />
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input type="password" name="confirm_password" placeholder="••••••••" style={styles.input} required minLength={6} />
              </div>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" className="btn btn-primary" style={styles.button}>
              Create BD account <ArrowRight size={18} />
            </button>
          </form>
        )}

        <p style={styles.footer}>
          Already have an account? <Link to="/bd/login" style={styles.link}>Sign in</Link>
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
    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
    padding: '24px',
  },
  card: {
    background: 'white',
    padding: '48px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '420px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--dark)',
    textDecoration: 'none',
    marginBottom: '16px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    borderRadius: '8px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 999,
    background: 'rgba(79, 70, 229, 0.12)',
    color: 'var(--primary)',
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: '20px',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: 'var(--dark)',
    marginBottom: '6px',
  },
  subtitle: {
    color: 'var(--gray)',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
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
    left: '14px',
    color: 'var(--gray-light)',
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    border: '1px solid var(--gray-border)',
    borderRadius: '12px',
    fontSize: '15px',
    outline: 'none',
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    margin: 0,
  },
  success: {
    color: '#16a34a',
    fontSize: '15px',
    fontWeight: 600,
    textAlign: 'center',
    margin: '24px 0',
  },
  button: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '4px',
    padding: '14px',
    fontSize: '15px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '22px',
    color: 'var(--gray)',
    fontSize: '14px',
  },
  link: {
    color: 'var(--primary)',
    fontWeight: '600',
    textDecoration: 'none',
  },
}
