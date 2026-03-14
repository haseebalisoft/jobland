import React, { useEffect, useState } from 'react'
import { Bell, Search, User, FileText, CheckCircle, Settings as SettingsIcon, LogOut } from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

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
    return <div style={{ padding: 40 }}>Please verify your email to access settings.</div>
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading settings...</div>
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
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}></div>
          HiredLogics
        </div>
        <nav style={styles.nav}>
          <NavItem icon={<User size={20} />} label="Overview" to="/dashboard" />
          <NavItem icon={<FileText size={20} />} label="Create Skill" to="/onboarding" />
          <NavItem icon={<CheckCircle size={20} />} label="Applications" />
          <NavItem icon={<SettingsIcon size={20} />} label="Settings" active to="/settings" />
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button
            type="button"
            onClick={logout}
            style={{
              ...styles.navItem,
              color: 'var(--gray)',
              background: 'transparent',
              border: 'none',
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.searchBar}>
            <Search size={18} color="var(--gray-light)" />
            <input type="text" placeholder="Search..." style={styles.searchInput} />
          </div>
          <div style={styles.profileArea}>
            <button style={styles.iconBtn}>
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
                padding: 12,
                borderRadius: 8,
                background: '#EEF2FF',
                color: '#4F46E5',
                fontSize: 14,
              }}
            >
              {message}
            </div>
          )}

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Profile</h2>
            <form
              onSubmit={handleSaveProfile}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}
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
                <div style={{ fontSize: 13, color: 'var(--gray)' }}>
                  Member since {new Date(createdAt).toLocaleDateString()}
                </div>
              )}
              <button type="submit" disabled={savingProfile} style={styles.primaryBtn}>
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Password</h2>
            <form
              onSubmit={handleChangePassword}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}
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

          <section>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Subscription</h2>
            <div
              style={{
                borderRadius: 12,
                border: '1px solid var(--gray-border)',
                padding: 16,
                background: 'white',
                maxWidth: 480,
              }}
            >
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

function NavItem({ icon, label, active, to }) {
  return (
    <a
      href={to || '#'}
      style={{
        ...styles.navItem,
        background: active ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--gray)',
        fontWeight: active ? '600' : '500',
      }}
    >
      {icon}
      {label}
    </a>
  )
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#F8FAFF',
    fontFamily: 'var(--font-primary)',
  },
  sidebar: {
    width: '260px',
    background: 'white',
    borderRight: '1px solid var(--gray-border)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '24px',
    fontWeight: '800',
    color: 'var(--dark)',
    marginBottom: '48px',
  },
  logoIcon: {
    width: '32px',
    height: '32px',
    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    borderRadius: '8px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    height: '72px',
    background: 'white',
    borderBottom: '1px solid var(--gray-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#F0F4FF',
    padding: '8px 16px',
    borderRadius: '20px',
    width: '300px',
  },
  searchInput: {
    border: 'none',
    background: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
  },
  profileArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--gray)',
    cursor: 'pointer',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--primary)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
  },
  content: {
    padding: '40px 32px',
    maxWidth: '1000px',
  },
  welcome: {
    fontSize: '32px',
    fontWeight: '800',
    color: 'var(--dark)',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'var(--gray)',
    fontSize: '16px',
    marginBottom: '32px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 14,
    color: 'var(--dark)',
  },
  input: {
    borderRadius: 8,
    border: '1px solid var(--gray-border)',
    padding: '10px 12px',
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 8,
    borderRadius: 999,
    border: 'none',
    padding: '10px 18px',
    background: 'var(--primary)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  secondaryBtn: {
    marginTop: 8,
    borderRadius: 999,
    border: '1px solid var(--gray-border)',
    padding: '10px 18px',
    background: 'white',
    color: 'var(--dark)',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: 14,
  },
  linkButton: {
    display: 'inline-block',
    borderRadius: 999,
    padding: '8px 16px',
    border: '1px solid var(--primary)',
    color: 'var(--primary)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
}

