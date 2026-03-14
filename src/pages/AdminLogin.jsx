import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import '../index.css'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import api, { setAccessToken } from '../services/api.js'

// Default admin: admin@hiredlogics.com / admin123 (create with: cd backend && npm run seed:admin)
const DEFAULT_ADMIN_EMAIL = 'admin@hiredlogics.com'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    const email = e.target.email.value
    const password = e.target.password.value

    try {
      const res = await api.post('/auth/admin/login', { email, password })
      setAccessToken(res.data.accessToken)
      setUser(res.data.user)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="auth-container" style={styles.container}>
      <div className="auth-card" style={styles.card}>
        <div style={styles.header}>
          <Link to="/" style={styles.logo}>
            <div style={styles.logoIcon}></div>
            HiredLogics · Admin
          </Link>
          <div style={styles.badge}>Admin only</div>
          <h2 style={styles.title}>Admin login</h2>
          <p style={styles.subtitle}>Sign in with your admin account</p>
        </div>

        <form style={styles.form} onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                name="email"
                placeholder={DEFAULT_ADMIN_EMAIL}
                defaultValue={DEFAULT_ADMIN_EMAIL}
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                style={styles.input}
                required
              />
            </div>
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" className="btn btn-primary" style={styles.button}>
            Sign in to Admin <ArrowRight size={18} />
          </button>
        </form>

        <p style={styles.footer}>
          Not admin? <Link to="/login" style={styles.link}>User login</Link>
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
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: '24px',
  },
  card: {
    background: 'white',
    padding: '48px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
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
    background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
    borderRadius: '8px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 999,
    background: 'rgba(15, 23, 42, 0.12)',
    color: '#1e293b',
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
  hint: {
    textAlign: 'center',
    marginTop: '12px',
    color: 'var(--gray)',
    fontSize: '12px',
    opacity: 0.9,
  },
  link: {
    color: 'var(--primary)',
    fontWeight: '600',
    textDecoration: 'none',
  },
}
