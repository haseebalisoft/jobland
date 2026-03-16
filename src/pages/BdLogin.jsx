import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import '../index.css'
import './Auth.css'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import api, { setAccessToken } from '../services/api.js'

export default function BdLogin() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    const email = e.target.email.value
    const password = e.target.password.value

    try {
      const res = await api.post('/auth/bd/login', { email, password })
      setAccessToken(res.data.accessToken)
      setUser(res.data.user)
      navigate('/bd')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="auth-container" style={styles.container}>
      <div className="auth-card" style={styles.card}>
        <div style={styles.header}>
          <Link to="/" style={styles.logo}>
            <img src="/logo.png" alt="HiredLogics" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
            <span>HiredLogics · BD Portal</span>
          </Link>
          <div style={styles.badge}>BD only</div>
          <h2 style={styles.title}>BD Portal</h2>
          <p style={styles.subtitle}>Sign in to manage your leads</p>
        </div>

        <form style={styles.form} onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input type="email" name="email" placeholder="bd@company.com" style={styles.input} required />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input type="password" name="password" placeholder="••••••••" style={styles.input} required />
            </div>
            <button
              type="button"
              style={styles.forgotButton}
              onClick={() =>
                window.alert(
                  'Forgot your BD password?\n\nAsk an admin to reset it for you in the Admin Dashboard (Users → Reset password). Once you can log in again, you can change it yourself from the BD Portal sidebar.',
                )
              }
            >
              Forgot password?
            </button>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={styles.button}>
            Sign in to BD Portal <ArrowRight size={18} />
          </button>
        </form>

        <p style={styles.footer}>
          Not a BD? <Link to="/login" style={styles.link}>User login</Link>
          {' · '}
          <Link to="/bd/signup" style={styles.link}>Create BD account</Link>
        </p>
      </div>
    </div>
  )
}

const theme = { primary: '#10B981', dark: '#0F172A', muted: '#64748B', border: '#E2E8F0' }
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, #0F172A 0%, #1e293b 50%, #334155 100%)',
    padding: '24px',
  },
  card: {
    background: 'white',
    padding: '48px 40px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.06)',
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
    gap: '10px',
    fontSize: '22px',
    fontWeight: '800',
    color: theme.dark,
    textDecoration: 'none',
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: 999,
    background: 'rgba(16, 185, 129, 0.14)',
    color: theme.primary,
    fontSize: '12px',
    fontWeight: 700,
    marginBottom: '20px',
    letterSpacing: '0.04em',
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: theme.dark,
    marginBottom: '6px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: theme.muted,
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
    color: theme.dark,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: theme.muted,
  },
  input: {
    width: '100%',
    padding: '14px 14px 14px 42px',
    border: `1px solid ${theme.border}`,
    borderRadius: '14px',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    margin: 0,
  },
  button: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '4px',
    padding: '14px 20px',
    fontSize: '15px',
    borderRadius: '14px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '22px',
    color: theme.muted,
    fontSize: '14px',
  },
  link: {
    color: theme.primary,
    fontWeight: '600',
    textDecoration: 'none',
  },
  forgotButton: {
    marginTop: 6,
    padding: 0,
    border: 'none',
    background: 'none',
    color: theme.primary,
    fontSize: 12,
    textDecoration: 'underline',
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
}
