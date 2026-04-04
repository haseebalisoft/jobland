import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import GreetingHeader from '../components/dashboard/GreetingHeader.jsx';
import ProgressStepper from '../components/dashboard/ProgressStepper.jsx';
import ProgressCard from '../components/dashboard/ProgressCard.jsx';
import ActionPanel from '../components/dashboard/ActionPanel.jsx';
import HeroExploreCard from '../components/dashboard/HeroExploreCard.jsx';
import QuickStatsSection from '../components/dashboard/QuickStatsSection.jsx';
import UpsellPromoGrid from '../components/dashboard/UpsellPromoGrid.jsx';
import ResourcesSection from '../components/dashboard/ResourcesSection.jsx';
import { useDashboardHome } from '../hooks/useDashboardHome.js';
import './DashboardHome.css';

function DashboardSkeleton() {
  return (
    <div className="dh-wrap">
      <div className="dh-skel" style={{ height: 36, maxWidth: 320, margin: '0 auto 16px' }} />
      <div className="dh-skel" style={{ height: 20, maxWidth: 420, margin: '0 auto 32px' }} />
      <div className="dh-skel" style={{ height: 44, marginBottom: 28 }} />
      <div className="dh-grid">
        <div className="dh-skel" style={{ minHeight: 280 }} />
        <div className="dh-skel" style={{ minHeight: 280 }} />
      </div>
      <div className="dh-skel" style={{ minHeight: 160, marginTop: 28 }} />
      <div className="dh-skel" style={{ height: 24, maxWidth: 140, marginBottom: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="dh-skel" style={{ minHeight: 220 }} />
        <div className="dh-skel" style={{ minHeight: 220 }} />
      </div>
      <div className="dh-skel" style={{ minHeight: 280, marginTop: 24 }} />
      <div className="dh-skel" style={{ height: 24, marginTop: 32, marginBottom: 16 }} />
      <div className="dh-skel" style={{ minHeight: 200 }} />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, profile, progress, actionPlan, plan, error, refetch } = useDashboardHome();
  const step = progress?.currentStep || 'application_materials';

  const displayName = useMemo(() => {
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    if (profile?.firstName) return profile.firstName;
    return user?.name || '';
  }, [profile, user]);

  const firstName = profile?.firstName || (user?.name || '').split(' ')[0] || 'there';

  const initials = useMemo(() => {
    const n = displayName || user?.name || '';
    return n
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  }, [displayName, user]);

  const handleCreateResume = async () => {
    try {
      const res = await api.post('/user/resume/create');
      const url = res.data?.startUrl || '/resume-maker';
      navigate(url);
    } catch {
      navigate('/resume-maker');
    }
  };

  if (!user) return null;

  if (!user.emailVerified) {
    return (
      <div style={{ padding: 40 }}>
        Please verify your email to access the dashboard.
      </div>
    );
  }

  if (!user.isActive) {
    return (
      <div style={{ padding: 40 }}>
        No active subscription. Please choose a plan on the home page.
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => navigate('/#pricing')} style={{ padding: '8px 16px' }}>
            Go to pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout userName={displayName} userInitials={initials}>
      {loading && <DashboardSkeleton />}
      {!loading && error && (
        <div style={{ padding: 40, color: '#b91c1c' }}>
          {error}
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        </div>
      )}
      {!loading && !error && actionPlan && progress && (
        <div className="dh-wrap" id="negotiation">
          <GreetingHeader
            firstName={firstName}
            subtitle="Here's an impactful action plan for your dream job hunt"
          />
          <ProgressStepper
            tabs={actionPlan.tabs || []}
            currentStep={step}
            onStepChange={() => refetch({ silent: true })}
          />
          <div className="dh-grid">
            <ProgressCard
              items={progress.items || []}
              completedSteps={progress.completedSteps ?? 0}
              totalSteps={progress.totalSteps ?? 0}
            />
            <div>
              <ActionPanel
                tag={actionPlan.tag}
                title={actionPlan.actionTitle}
                body={actionPlan.actionBody}
                ctaLabel={actionPlan.ctaLabel}
                onCta={handleCreateResume}
              />
              {plan?.plan === 'free' && (
                <p style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>
                  Current plan: <strong>{plan.plan_name || 'Free'}</strong> — upgrade for full access.
                </p>
              )}
            </div>
          </div>

          {actionPlan.hero && (
            <HeroExploreCard
              title={actionPlan.hero.title}
              subtitle={actionPlan.hero.subtitle}
              ctaLabel={actionPlan.hero.ctaLabel}
              ctaPath={actionPlan.hero.ctaPath}
            />
          )}

          {actionPlan.quickStats && (
            <QuickStatsSection
              sectionTitle={actionPlan.quickStats.sectionTitle}
              cards={actionPlan.quickStats.cards || []}
            />
          )}

          {(actionPlan.upsell || (actionPlan.promos && actionPlan.promos.length > 0)) && (
            <UpsellPromoGrid
              upsell={actionPlan.upsell}
              promos={actionPlan.promos || []}
              showUpsell={plan?.plan === 'free'}
            />
          )}

          {actionPlan.resources && (
            <ResourcesSection
              title={actionPlan.resources.title}
              viewAllLabel={actionPlan.resources.viewAllLabel}
              viewAllPath={actionPlan.resources.viewAllPath}
              items={actionPlan.resources.items || []}
            />
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
