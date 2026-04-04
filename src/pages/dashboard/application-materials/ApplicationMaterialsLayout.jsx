import { NavLink, Outlet } from 'react-router-dom';
import DashboardLayout from '../../../components/layout/DashboardLayout.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import './applicationMaterials.css';

const links = [
  { to: '/dashboard/application-materials/documents', label: 'My Documents' },
  { to: '/dashboard/application-materials/linkedin', label: 'LinkedIn' },
  { to: '/dashboard/application-materials/cover-letters', label: 'Cover Letters' },
];

export default function ApplicationMaterialsLayout() {
  const { user } = useAuth();
  const initials =
    String(user?.name || '')
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <DashboardLayout userName={user?.name || ''} userInitials={initials}>
      <div className="am-page">
        <header className="am-header">
          <h1>Application Materials</h1>
        </header>
        <div className="am-page__inner">
          <nav className="am-subnav" aria-label="Application materials sections">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                end
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </div>
      </div>
    </DashboardLayout>
  );
}
