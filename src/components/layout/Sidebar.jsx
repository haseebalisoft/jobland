import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  Briefcase,
  MonitorPlay,
  Target,
  MessageCircle,
  FolderOpen,
  Users,
  Sparkles,
  SlidersHorizontal,
  Puzzle,
  Lightbulb,
  Bug,
  PanelLeftClose,
  PanelLeft,
  User,
  Settings,
  CreditCard,
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats.js';

const sections = [
  {
    label: 'MAIN',
    items: [
      { to: '/dashboard', label: 'Home', icon: Home, end: true },
      { to: '/resume-maker', label: 'Resume Builder', icon: FileText },
      { to: '/dashboard/job-tracker', label: 'Job Tracker', icon: Briefcase, badge: 'jobs' },
      { to: '/dashboard/mock-interviews', label: 'Mock Interviews', icon: MonitorPlay },
      { to: '/dashboard/score-resume', label: 'Score Resume', icon: Target },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      // { to: '/dashboard/application-materials/documents', label: 'Application Materials', icon: FolderOpen },
      { to: '/dashboard/job-preferences', label: 'Job Preferences', icon: SlidersHorizontal },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      {
        to: '/dashboard/profile',
        label: 'My Profile',
        icon: User,
        match: (p) => p === '/profile' || p === '/dashboard/profile',
      },
      {
        to: '/dashboard/settings',
        label: 'Account Settings',
        icon: Settings,
        match: (p) => p === '/settings' || p === '/dashboard/settings',
      },
      {
        to: '/dashboard/billing',
        label: 'Billing & Plans',
        icon: CreditCard,
        match: (p) => p === '/billing' || p === '/dashboard/billing',
      },
    ],
  },
  // {
  //   label: 'SUPPORT',
  //   items: [{ to: '/dashboard', label: 'Chrome Extension', icon: Puzzle }],
  // },
];

function isActive(path, item, hash) {
  if (typeof item.match === 'function') return item.match(path);
  if (item.hash) return path === item.to && hash === item.hash;
  if (item.end) return path === item.to;
  if (path === item.to) return true;
  return path.startsWith(`${item.to}/`);
}

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation();
  const { stats } = useDashboardStats();
  const displayBadge = stats?.totalLeads || 0;

  return (
    <aside className={`dl-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="dl-sidebar__accent" />
      <Link to="/dashboard" className="dl-sidebar__logo">
        <img src="/logo.png" alt="" className="dl-sidebar__logo-img" width={34} height={34} />
        {!collapsed && (
          <div>
            <div className="dl-sidebar__brand">HiredLogics</div>
            <div className="dl-sidebar__subbrand">AI-powered career tools</div>
          </div>
        )}
      </Link>

      <div className="dl-sidebar__scroll">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && <div className="dl-sidebar__section">{section.label}</div>}
            {section.items.map((item) => {
              const active = isActive(location.pathname, item, location.hash);
              const to = `${item.to}${item.hash || ''}`;
              return (
                <Link key={`${section.label}-${item.label}`} to={to} className={`dl-sidebar__link${active ? ' active' : ''}`}>
                  <item.icon size={18} />
                  <span className="dl-sidebar__label">{item.label}</span>
                  {item.beta && !collapsed && <span className="dl-sidebar__beta">Beta</span>}
                  {item.badge === 'jobs' && !collapsed && <span className="dl-sidebar__count">{displayBadge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <Link to="/dashboard/settings" className="dl-sidebar__user-card">
        <div className="dl-sidebar__user-avatar">U</div>
        {!collapsed && (
          <div>
            <div className="dl-sidebar__user-name">Your Profile</div>
            <div className="dl-sidebar__user-plan">Premium Plan</div>
          </div>
        )}
      </Link>

      <button
        type="button"
        className="dl-sidebar__collapse"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={onToggleCollapse}
      >
        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </aside>
  );
}
