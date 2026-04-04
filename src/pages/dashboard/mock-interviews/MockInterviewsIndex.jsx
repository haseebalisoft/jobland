import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trophy } from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { isFreePlanUser } from '../../../utils/subscription.js';
import CategoryTabs, { tabToCategoryFilter } from '../../../components/mock-interviews/CategoryTabs.jsx';
import ScenarioCard from '../../../components/mock-interviews/ScenarioCard.jsx';
import { useScenarios } from '../../../hooks/useScenarios.js';
import '../../../components/mock-interviews/mockInterviews.css';

export default function MockInterviewsIndex() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('All Scenario');
  const [search, setSearch] = useState('');
  const category = useMemo(() => tabToCategoryFilter(tab), [tab]);
  const { scenarios, loading } = useScenarios({ category, search });
  const isPremiumUser = user && !isFreePlanUser(user);

  const initials =
    String(user?.name || '')
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const onStart = (scenario) => {
    if (scenario.is_premium && !isPremiumUser) {
      navigate('/checkout');
      return;
    }
    navigate(`/dashboard/mock-interviews/${scenario.id}/setup`);
  };

  return (
    <DashboardLayout userName={user?.name || ''} userInitials={initials}>
      <div className="mi-page">
        <header className="mi-header">
          <h1>Mock Interview</h1>
          {isPremiumUser ? (
            <button
              type="button"
              className="mi-header__cta"
              onClick={() => navigate('/dashboard/mock-interviews/history')}
            >
              <Plus size={18} />
              Start Custom Interview
            </button>
          ) : (
            <button type="button" className="mi-header__cta" onClick={() => navigate('/checkout')}>
              <Plus size={18} />
              Upgrade to Start Mock Interview
            </button>
          )}
        </header>

        <div className="mi-page__inner">
          <div className="mi-toolbar">
            <label className="mi-search">
              <Search size={18} color="#9ca3af" />
              <input
                type="search"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>

          <CategoryTabs active={tab} onChange={setTab} />

          <div className="mi-challenges">
            <Trophy size={18} color="#eab308" />
            Challenges
          </div>

          {loading ? (
            <div className="mi-loading">Loading scenarios…</div>
          ) : scenarios.length === 0 ? (
            <div className="mi-empty">No scenarios match your filters.</div>
          ) : (
            <div className="mi-grid">
              {scenarios.map((s) => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  locked={!!s.is_premium && !isPremiumUser}
                  onStart={onStart}
                  onUpgrade={() => navigate('/checkout')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
