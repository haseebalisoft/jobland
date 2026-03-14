import React, { useEffect, useState } from 'react'
import { Bell, Search } from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import UserSidebar from '../components/UserSidebar.jsx'

const theme = {
  primary: '#10B981',
  blue: '#2563EB',
  violet: '#7C3AED',
  slate: '#0F172A',
  slateLight: '#1E293B',
  bg: '#F1F5F9',
  cardBg: '#ffffff',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
}

export default function Settings() {
  const { user, logout, setUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [subscription, setSubscription] = useState(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    let isMounted = true
    api
      .get('/settings')
      .then((res) => {
        if (!isMounted) return
        const { user: u, subscription: sub } = res.data
        setFullName(u.full_name || '')
        setEmail(u.email || '')
        setCreatedAt(u.created_at || '')
        setSubscription(sub)
      })
      .catch((err) => {
        setMessage(err.response?.data?.message || 'Failed to load settings')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  if (!user) return null

  if (!user.emailVerified) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg }}>
        <UserSidebar />
        <main style={{ flex: 1, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: theme.textMuted }}>Please verify your email to access settings.</p>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: theme.bg }}>
        <UserSidebar />
        <main style={{ flex: 1, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: theme.textMuted }}>Loading settings...</p>
        </main>
      </div>
    )
  }

  const initials =
    (user.name || '')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setMessage('')
    try {
      const res = await api.put('/settings/profile', { full_name: fullName })
      setUser(res.data.user)
      setMessage('Profile updated successfully.')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setSavingPassword(true)
    setMessage('')
    try {
      await api.put('/settings/password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Password changed successfully.')
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const currentPlan = subscription?.plan_id || user.subscription_plan || 'free'
  const subscriptionStatus = subscription?.status || (user.isActive ? 'active' : 'inactive')
  const renewDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : 'N/A'

  return (
    <div style={styles.layout}>
      <UserSidebar />
      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.searchBar}>
            <Search size={18} style={{ color: theme.textMuted }} />
            <input type="text" placeholder="Search..." style={styles.searchInput} />
          </div>
          <div style={styles.profileArea}>
            <button type="button" style={styles.iconBtn} aria-label="Notifications">
              <Bell size={20} />
            </button>
            <div style={styles.avatar}>{initials}</div>
          </div>
        </header>

        <div style={styles.content}>
          <h1 style={styles.welcome}>Account settings</h1>
          <p style={styles.subtitle}>
            Manage your profile, password, and subscription. Signed in as <strong>{email}</strong>.
          </p>

          {message && (
            <div
              style={{
                marginBottom: 24,
                padding: 14,
                borderRadius: 12,
                background: message.includes('success') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(37, 99, 235, 0.1)',
                color: message.includes('success') ? '#059669' : theme.blue,
                fontSize: 14,
                fontWeight: 500,
                border: `1px solid ${message.includes('success') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(37, 99, 235, 0.2)'}`,
              }}
            >
              {message}
            </div>
          )}

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Profile</h2>
            <form
              onSubmit={handleSaveProfile}
              style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}
            >
              <label style={styles.label}>
                <span>Full name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                <span>Email</span>
                <input type="email" value={email} disabled style={styles.input} />
              </label>
              {createdAt && (
                <div style={{ fontSize: 13, color: theme.textMuted }}>
                  Member since {new Date(createdAt).toLocaleDateString()}
                </div>
              )}
              <button type="submit" disabled={savingProfile} style={styles.primaryBtn}>
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Password</h2>
            <form
              onSubmit={handleChangePassword}
              style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}
            >
              <label style={styles.label}>
                <span>Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                />
              </label>
              <button type="submit" disabled={savingPassword} style={styles.secondaryBtn}>
                {savingPassword ? 'Updating...' : 'Change password'}
              </button>
            </form>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Subscription</h2>
            <div style={styles.subscriptionCard}>
              <div style={{ marginBottom: 8 }}>
                <strong>Current plan:</strong> {currentPlan}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Status:</strong> {subscriptionStatus}
              </div>
              <div style={{ marginBottom: 16 }}>
                <strong>Renews on:</strong> {renewDate}
              </div>
              <a href="/#pricing" style={styles.linkButton}>
                Change plan
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: theme.bg,
    fontFamily: 'var(--font-primary), system-ui, sans-serif',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  header: {
    height: 72,
    background: theme.cardBg,
    borderBottom: `1px solid ${theme.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: theme.bg,
    padding: '10px 16px',
    borderRadius: 12,
    width: 280,
    border: `1px solid ${theme.border}`,
  },
  searchInput: {
    border: 'none',
    background: 'none',
    outline: 'none',
    width: '100%',
    fontSize: 14,
    color: theme.text,
  },
  profileArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: theme.textMuted,
    cursor: 'pointer',
    padding: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.blue} 100%)`,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  content: {
    padding: '32px 32px 48px',
    maxWidth: 1000,
  },
  welcome: {
    fontSize: 28,
    fontWeight: 800,
    color: theme.text,
    marginBottom: 8,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: theme.textMuted,
    fontSize: 15,
    marginBottom: 28,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.text,
    marginBottom: 14,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 14,
    color: theme.text,
  },
  input: {
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: '10px 14px',
    fontSize: 14,
    background: theme.cardBg,
    color: theme.text,
  },
  primaryBtn: {
    marginTop: 4,
    borderRadius: 10,
    border: 'none',
    padding: '12px 20px',
    background: theme.primary,
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  secondaryBtn: {
    marginTop: 4,
    borderRadius: 10,
    border: `1px solid ${theme.border}`,
    padding: '12px 20px',
    background: theme.cardBg,
    color: theme.text,
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: 14,
  },
  subscriptionCard: {
    borderRadius: 12,
    border: `1px solid ${theme.border}`,
    padding: 20,
    background: theme.cardBg,
    maxWidth: 480,
  },
  linkButton: {
    display: 'inline-block',
    borderRadius: 10,
    padding: '10px 18px',
    border: `1px solid ${theme.primary}`,
    color: theme.primary,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
  },
}
