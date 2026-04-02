import React, { useEffect, useState } from 'react'
import { Bell, Search, User, Lock, CreditCard, CheckCircle } from 'lucide-react'
import api from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import UserSidebar from '../components/UserSidebar.jsx'
import './Settings.css'

export default function Settings() {
  const { user, logout, setUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [cancelingSubscription, setCancelingSubscription] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [message, setMessage] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [subscription, setSubscription] = useState(null)
  const [subscriptionPlanName, setSubscriptionPlanName] = useState('')

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
        setSubscriptionPlanName(u.subscription_plan_name || '')
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
      <div className="settings-empty">
        <UserSidebar />
        <main>
          <p>Please verify your email to access settings.</p>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="settings-empty">
        <UserSidebar />
        <main>
          <p>Loading settings...</p>
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

  const handleCancelSubscription = async () => {
    if (cancelingSubscription) return
    setCancelingSubscription(true)
    setMessage('')
    try {
      const res = await api.post('/subscriptions/opt-out-free')
      if (res.data?.user) {
        setUser(res.data.user)
      }
      setSubscription((prev) => ({
        ...(prev || {}),
        status: 'canceled',
      }))
      setSubscriptionPlanName('Free Plan')
      setShowCancelConfirm(false)
      setMessage(
        res.data?.already_on_free
          ? 'Subscription already canceled. You are on the free plan.'
          : 'Subscription canceled successfully. Your account is now on the free plan.',
      )
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to cancel subscription')
    } finally {
      setCancelingSubscription(false)
    }
  }

  const currentPlan =
    subscriptionPlanName ||
    subscription?.plan_name ||
    subscription?.plan_id ||
    user.subscription_plan ||
    'Free Plan'
  const subscriptionStatus = subscription?.status || (user.isActive ? 'active' : 'inactive')
  const renewDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : 'N/A'
  const normalizedPlan = String(subscription?.plan_id || user.subscription_plan || '').toLowerCase()
  const canCancelSubscription =
    normalizedPlan !== 'free' && ['active', 'trialing', 'past_due'].includes(subscriptionStatus)
  const isSuccess = message && message.toLowerCase().includes('success')

  return (
    <div className="settings-page">
      <UserSidebar />
      <main className="settings-main">
        <header className="settings-header">
          <div className="settings-search">
            <Search size={18} style={{ color: '#94A3B8', flexShrink: 0 }} />
            <input type="text" placeholder="Search settings..." />
          </div>
          <div className="settings-header-right">
            <button type="button" className="settings-icon-btn" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <div className="settings-avatar">{initials}</div>
          </div>
        </header>

        <div className="settings-content">
          <div className="settings-hero">
            <h1 className="settings-title">Account settings</h1>
            <p className="settings-subtitle">
              Manage your profile, password, and subscription. Signed in as <strong style={{ color: '#0F172A' }}>{email}</strong>.
            </p>
          </div>

          {message && (
            <div className={`settings-alert ${isSuccess ? 'settings-alert--success' : 'settings-alert--error'}`}>
              {isSuccess && <CheckCircle size={20} />}
              {message}
            </div>
          )}

          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon settings-card-icon--profile">
                <User size={22} />
              </div>
              <div>
                <h2 className="settings-card-title">Profile</h2>
                <p className="settings-card-subtitle">Update your name and view account info</p>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="settings-form">
              <div className="settings-field">
                <label>
                  <span>Full name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="settings-input"
                  />
                </label>
              </div>
              <div className="settings-field">
                <label>
                  <span>Email</span>
                  <input type="email" value={email} disabled className="settings-input" />
                </label>
              </div>
              {createdAt && (
                <p className="settings-meta">Member since {new Date(createdAt).toLocaleDateString()}</p>
              )}
              <button type="submit" disabled={savingProfile} className="settings-btn settings-btn-primary">
                {savingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </section>

          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon settings-card-icon--password">
                <Lock size={22} />
              </div>
              <div>
                <h2 className="settings-card-title">Password</h2>
                <p className="settings-card-subtitle">Change your password to keep your account secure</p>
              </div>
            </div>
            <form onSubmit={handleChangePassword} className="settings-form">
              <div className="settings-field">
                <label>
                  <span>Current password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="settings-input"
                    placeholder="••••••••"
                  />
                </label>
              </div>
              <div className="settings-field">
                <label>
                  <span>New password</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="settings-input"
                    placeholder="••••••••"
                  />
                </label>
              </div>
              <button type="submit" disabled={savingPassword} className="settings-btn settings-btn-secondary">
                {savingPassword ? 'Updating...' : 'Change password'}
              </button>
            </form>
          </section>

          <section className="settings-card settings-subscription-card">
            <div className="settings-card-header">
              <div className="settings-card-icon settings-card-icon--subscription">
                <CreditCard size={22} />
              </div>
              <div>
                <h2 className="settings-card-title">Subscription</h2>
                <p className="settings-card-subtitle">Your current plan and billing</p>
              </div>
            </div>
            <div className="settings-subscription-row">
              <span className="settings-subscription-label">Current plan</span>
              <span className="settings-plan-badge">{currentPlan}</span>
            </div>
            <div className="settings-subscription-row">
              <span className="settings-subscription-label">Status</span>
              <span className={`settings-status-badge settings-status-badge--${subscriptionStatus === 'active' ? 'active' : 'inactive'}`}>
                {subscriptionStatus}
              </span>
            </div>
            <div className="settings-subscription-row">
              <span className="settings-subscription-label">Renews on</span>
              <span className="settings-subscription-value">{renewDate}</span>
            </div>
            <a href="/#pricing" className="settings-link-btn">
              Change plan
            </a>
            {canCancelSubscription && (
              <div className="settings-cancel-section">
                {!showCancelConfirm ? (
                  <button
                    type="button"
                    className="settings-btn settings-btn-danger"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={cancelingSubscription}
                  >
                    Cancel subscription
                  </button>
                ) : (
                  <div className="settings-cancel-confirm">
                    <p>
                      This will cancel your paid subscription and move your account to the free plan.
                    </p>
                    <div className="settings-cancel-confirm-actions">
                      <button
                        type="button"
                        className="settings-btn settings-btn-secondary"
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={cancelingSubscription}
                      >
                        Keep subscription
                      </button>
                      <button
                        type="button"
                        className="settings-btn settings-btn-danger"
                        onClick={handleCancelSubscription}
                        disabled={cancelingSubscription}
                      >
                        {cancelingSubscription ? 'Canceling...' : 'Confirm cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
