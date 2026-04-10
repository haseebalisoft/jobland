import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import ProfileCard from '../components/settings/ProfileCard.jsx';
import PasswordCard from '../components/settings/PasswordCard.jsx';
import SubscriptionCard from '../components/settings/SubscriptionCard.jsx';
import './Settings.css';

export default function Settings() {
  const { user, setUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [cancelingSubscription, setCancelingSubscription] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [message, setMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [subscriptionPlanName, setSubscriptionPlanName] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let isMounted = true;
    api
      .get('/settings')
      .then((res) => {
        if (!isMounted) return;
        const { user: u, subscription: sub } = res.data;
        setFullName(u.full_name || '');
        setEmail(u.email || '');
        setCreatedAt(u.created_at || '');
        setSubscription(sub);
        setSubscriptionPlanName(u.subscription_plan_name || '');
      })
      .catch((err) => {
        setMessage(err.response?.data?.message || 'Failed to load settings');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = useMemo(() => user?.name || fullName || 'User', [user?.name, fullName]);
  const initials = useMemo(() => {
    const n = displayName || '';
    return (
      n
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U'
    );
  }, [displayName]);

  if (!user) return null;

  if (!user.emailVerified) {
    return (
      <DashboardLayout userName={displayName} userInitials={initials}>
        <div className="hl-set-page">
          <p className="hl-set-lead">Please verify your email to access settings.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout userName={displayName} userInitials={initials}>
        <div className="hl-set-page">
          <p className="hl-set-lead">Loading settings…</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage('');
    try {
      const res = await api.put('/settings/profile', { full_name: fullName });
      setUser(res.data.user);
      setMessage('Profile updated successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    setMessage('');
    try {
      await api.put('/settings/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password changed successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (cancelingSubscription) return;
    setCancelingSubscription(true);
    setMessage('');
    try {
      const res = await api.post('/subscriptions/opt-out-free');
      if (res.data?.user) {
        setUser(res.data.user);
      }
      setSubscription((prev) => ({
        ...(prev || {}),
        status: 'canceled',
      }));
      setSubscriptionPlanName('Free Plan');
      setShowCancelConfirm(false);
      setMessage(
        res.data?.already_on_free
          ? 'Subscription already canceled. You are on the free plan.'
          : 'Subscription canceled successfully. Your account is now on the free plan.',
      );
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setCancelingSubscription(false);
    }
  };

  const currentPlan =
    subscriptionPlanName ||
    subscription?.plan_name ||
    subscription?.plan_id ||
    user.subscription_plan ||
    'Free Plan';
  const subscriptionStatus = subscription?.status || (user.isActive ? 'active' : 'inactive');
  const renewDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : 'N/A';
  const normalizedPlan = String(subscription?.plan_id || user.subscription_plan || '').toLowerCase();
  const canCancelSubscription =
    normalizedPlan !== 'free' && ['active', 'trialing', 'past_due'].includes(subscriptionStatus);
  const isSuccess = message && message.toLowerCase().includes('success');

  return (
    <DashboardLayout userName={displayName} userInitials={initials}>
      <div className="hl-set-page">
        <header className="hl-set-hero">
          <h1 className="hl-set-title">Account settings</h1>
          <p className="hl-set-lead">
            Manage your profile, password, and subscription. Signed in as <strong>{email}</strong>.
          </p>
        </header>

        {message ? (
          <div className={`hl-set-alert ${isSuccess ? 'hl-set-alert--ok' : 'hl-set-alert--err'}`}>
            {isSuccess && <CheckCircle size={20} aria-hidden />}
            {message}
          </div>
        ) : null}

        <ProfileCard
          fullName={fullName}
          setFullName={setFullName}
          email={email}
          createdAt={createdAt}
          onSubmit={handleSaveProfile}
          savingProfile={savingProfile}
        />

        <PasswordCard
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          onSubmit={handleChangePassword}
          savingPassword={savingPassword}
        />

        <SubscriptionCard
          currentPlan={currentPlan}
          subscriptionStatus={subscriptionStatus}
          renewDate={renewDate}
          canCancelSubscription={canCancelSubscription}
          showCancelConfirm={showCancelConfirm}
          setShowCancelConfirm={setShowCancelConfirm}
          cancelingSubscription={cancelingSubscription}
          onCancelSubscription={handleCancelSubscription}
        />
      </div>
    </DashboardLayout>
  );
}
