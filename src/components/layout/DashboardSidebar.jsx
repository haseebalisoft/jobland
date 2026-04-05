import { useState, useEffect } from 'react';
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
  SlidersHorizontal,
  Sparkles,
  Puzzle,
  Lightbulb,
  Bug,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

const navMain = [
  { to: '/dashboard', label: 'Home', icon: Home, end: true },
  { to: '/resume-maker', label: 'Resume Builder', icon: FileText },
  { to: '/dashboard/job-tracker', label: 'Job Tracker', icon: Briefcase },
  { to: '/dashboard/mock-interviews', label: 'Mock Interviews', icon: MonitorPlay },
  { to: '/dashboard/score-resume', label: 'Score Resume', icon: Target },
  { to: '/dashboard', label: 'Negotiation Agent', icon: MessageCircle, beta: true, hash: '#negotiation' },
  {
    key: 'appmat',
    label: 'Application Materials',
    icon: FolderOpen,
    children: [
      { to: '/dashboard/application-materials/documents', label: 'My Documents' },
      { to: '/dashboard/application-materials/linkedin', label: 'LinkedIn' },
      { to: '/dashboard/application-materials/cover-letters', label: 'Cover Letters' },
    ],
  },
  {
    key: 'net',
    label: 'Networking',
    icon: Users,
    children: [],
  },
  { to: '/dashboard/job-preferences', label: 'Job Preferences', icon: SlidersHorizontal },
  {
    key: 'ai',
    label: 'AI Toolbox',
    icon: Sparkles,
    children: [
      { to: '/dashboard/personal-brand-statement', label: 'Personal Brand Statement' },
      { to: '/dashboard/email-writer', label: 'Email Writer' },
      { to: '/dashboard/elevator-pitch', label: 'Elevator Pitch' },
      { to: '/dashboard/help', label: 'Help' },
    ],
  },
];

const navBottom = [
  { to: '/dashboard/score-resume', label: 'Chrome Extension', icon: Puzzle },
  { to: '/settings', label: 'Suggest a Feature', icon: Lightbulb },
  { to: '/settings', label: 'Report a Bug', icon: Bug },
];

function matchPath(pathname, to, end) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function DashboardSidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation();
  const path = location.pathname;
  const [expanded, setExpanded] = useState(() => ({}));

  useEffect(() => {
    if (path.startsWith('/dashboard/application-materials')) {
      setExpanded((e) => ({ ...e, appmat: true }));
    }
  }, [path]);

  useEffect(() => {
    const aiChildPrefixes = [
      '/dashboard/personal-brand-statement',
      '/dashboard/email-writer',
      '/dashboard/elevator-pitch',
      '/dashboard/help',
    ];
    if (aiChildPrefixes.some((p) => path === p || path.startsWith(`${p}/`))) {
      setExpanded((e) => ({ ...e, ai: true }));
    }
  }, [path]);

  const toggle = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  return (
    <aside className={`dl-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="dl-sidebar__scroll">
        {navMain.map((item) => {
          if (item.to && item.hash) {
            const active = path === item.to && location.hash === item.hash;
            return (
              <Link
                key={item.label}
                to={`${item.to}${item.hash}`}
                className={`dl-sidebar__link${active ? ' active' : ''}`}
              >
                <item.icon size={20} />
                <span className="dl-sidebar__label">{item.label}</span>
                {item.beta && <span className="dl-sidebar__badge">Beta</span>}
              </Link>
            );
          }
          if (item.to) {
            const active = matchPath(path, item.to, item.end);
            return (
              <Link key={item.to} to={item.to} className={`dl-sidebar__link${active ? ' active' : ''}`}>
                <item.icon size={20} />
                <span className="dl-sidebar__label">{item.label}</span>
                {item.beta && <span className="dl-sidebar__badge">Beta</span>}
              </Link>
            );
          }
          const open = expanded[item.key];
          const parentActive =
            (item.key === 'appmat' && path.startsWith('/dashboard/application-materials')) ||
            (item.key === 'net' &&
              item.children?.some((c) => path === c.to || path.startsWith(`${c.to}/`))) ||
            (item.key === 'ai' &&
              item.children?.some((c) => path === c.to || path.startsWith(`${c.to}/`)));
          return (
            <div key={item.key}>
              <button
                type="button"
                className={`dl-sidebar__link${parentActive ? ' active' : ''}`}
                onClick={() => toggle(item.key)}
              >
                <item.icon size={20} />
                <span className="dl-sidebar__label dl-sidebar__label--grow">
                  {item.label}
                </span>
                <ChevronRight size={16} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
              </button>
              {open && !collapsed && item.children && item.children.length > 0 && (
                <div className="dl-sidebar__sub">
                  {item.children.map((c) => {
                    const subActive = path === c.to || path.startsWith(`${c.to}/`);
                    return (
                      <Link key={c.to + c.label} to={c.to} className={subActive ? 'active' : ''}>
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="dl-sidebar__sep" />

        {navBottom.map((item) => (
          <Link key={item.label} to={item.to} className={`dl-sidebar__link${matchPath(path, item.to, false) ? ' active' : ''}`}>
            <item.icon size={20} />
            <span className="dl-sidebar__label">{item.label}</span>
          </Link>
        ))}
      </div>

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
