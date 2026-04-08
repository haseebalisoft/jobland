import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import api from '../services/api.js';
import HeroBanner from '../components/dashboard/HeroBanner.jsx';
import AnalyticsGrid from '../components/dashboard/AnalyticsGrid.jsx';
import PipelineCard from '../components/dashboard/PipelineCard.jsx';
import ChecklistCard from '../components/dashboard/ChecklistCard.jsx';
import AIAssistantCard from '../components/dashboard/AIAssistantCard.jsx';
import { useDashboardStats } from '../hooks/useDashboardStats.js';
import { useProfileScore } from '../hooks/useProfileScore.js';
import './DashboardHome.css';

export default function Dashboard() {
  const { user } = useAuth();
  const { stats, loading, error, refetch } = useDashboardStats();
  const { score } = useProfileScore();
  const [tasks, setTasks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [pipeline, setPipeline] = useState({ saved: 0, applied: 0, interviewing: 0, offer: 0, rejected: 0 });

  const displayName = useMemo(() => {
    return user?.name || '';
  }, [user]);

  const firstName = (user?.name || '').split(' ')[0] || 'there';

  const initials = useMemo(() => {
    const n = user?.name || '';
    return n
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  }, [user]);

  useEffect(() => {
    const loadExtras = async () => {
      try {
        const [taskRes, aiRes, jobsRes] = await Promise.all([
          api.get('/dashboard/tasks'),
          api.get('/ai/suggestions'),
          api.get('/jobs/counts'),
        ]);
        setTasks(taskRes.data?.tasks || []);
        setSuggestions(aiRes.data?.suggestions || []);
        setPipeline({
          saved: Number(jobsRes.data?.saved || 0),
          applied: Number(jobsRes.data?.applied || 0),
          interviewing: Number(jobsRes.data?.interviewing || 0),
          offer: Number(jobsRes.data?.offer || 0),
          rejected: Number(jobsRes.data?.rejected || 0),
        });
      } catch {
        setTasks([]);
        setSuggestions([]);
      }
    };
    loadExtras();
  }, []);

  const urgentAction =
    suggestions[0]?.body ||
    (stats?.pendingResponse > 0
      ? `You have ${stats.pendingResponse} pending responses waiting for a follow up.`
      : 'Add one new lead today to keep your momentum high.');

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
      <div className="new-dash">
        {loading ? <div className="dash-loading">Loading dashboard...</div> : null}
        {!loading && error ? (
          <div className="dash-error">
            {error}
            <button type="button" onClick={refetch}>Retry</button>
          </div>
        ) : null}
        {!loading && !error ? (
          <div className="new-dash__wrap" id="negotiation">
            <HeroBanner firstName={firstName} urgentAction={urgentAction} profileScore={score} />
            <AnalyticsGrid stats={stats} />
            <section className="bottom-row">
              <div className="bottom-row__pipeline">
                <PipelineCard counts={pipeline} />
              </div>
              <ChecklistCard tasks={tasks} />
              <AIAssistantCard suggestions={suggestions} />
            </section>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
