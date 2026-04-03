import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  Briefcase,
  MonitorPlay,
  MessageCircle,
  FolderOpen,
  Users,
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
  { to: '/dashboard/applications', label: 'Job Tracker', icon: Briefcase },
  { to: '/dashboard/help', label: 'Mock Interviews', icon: MonitorPlay },
  { to: '/dashboard', label: 'Negotiation Agent', icon: MessageCircle, beta: true, hash: '#negotiation' },
  { key: 'appmat', label: 'Application Materials', icon: FolderOpen, children: [{ to: '/profile-builder', label: 'Profile builder' }, { to: '/upload_cv', label: 'Upload CV' }] },
  { key: 'net', label: 'Networking', icon: Users, children: [{ to: '/dashboard', label: 'Dashboard home' }] },
  { key: 'ai', label: 'AI Toolbox', icon: Sparkles, children: [{ to: '/free-tools', label: 'Free tools' }] },
];

const navBottom = [
  { to: '/free-tools', label: 'Chrome Extension', icon: Puzzle },
  { to: '/settings', label: 'Suggest a Feature', icon: Lightbulb },
  { to: '/settings', label: 'Report a bug', icon: Bug },
];

function matchPath(pathname, to, end) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function DashboardSidebar({ collapsed, onToggleCollapse }) {
  const location = useLocation();
  const path = location.pathname;
  const [expanded, setExpanded] = useState(() => ({}));

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
          return (
            <div key={item.key}>
              <button type="button" className="dl-sidebar__link" onClick={() => toggle(item.key)}>
                <item.icon size={20} />
                <span className="dl-sidebar__label" style={{ flex: 1 }}>
                  {item.label}
                </span>
                <ChevronRight size={16} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
              </button>
              {open && !collapsed && item.children && (
                <div className="dl-sidebar__sub">
                  {item.children.map((c) => (
                    <Link key={c.to + c.label} to={c.to}>
                      {c.label}
                    </Link>
                  ))}
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
