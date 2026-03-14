import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import '../index.css'
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
          <p style={styles.subtitle}>Sign in to manage leads (BD / Admin only)</p>
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
  forgotButton: {
    marginTop: 6,
    padding: 0,
    border: 'none',
    background: 'none',
    color: 'var(--primary)',
    fontSize: 12,
    textDecoration: 'underline',
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
}
