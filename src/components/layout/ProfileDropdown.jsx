import { Link } from 'react-router-dom';

const items = [
  { to: '/dashboard/profile', label: 'My Profile' },
  { to: '/dashboard/settings', label: 'Account Settings' },
  { to: '/dashboard/billing', label: 'Billing & Plans' },
  { to: '/dashboard/help', label: 'Help & Support' },
];

export default function ProfileDropdown({ open, onClose, name, email, onLogout }) {
  if (!open) return null;

  return (
    <div className="dl-profile-dd">
      <div className="dl-profile-dd__header">
        <div className="dl-profile-dd__avatar">{(name || 'U').slice(0, 1).toUpperCase()}</div>
        <div>
          <div className="dl-profile-dd__name">{name || 'User'}</div>
          <div className="dl-profile-dd__email">{email || 'user@example.com'}</div>
        </div>
        <span className="dl-profile-dd__badge">Premium</span>
      </div>
      <div className="dl-profile-dd__menu">
        {items.map((item) => (
          <Link key={item.label} to={item.to} className="dl-profile-dd__item" onClick={onClose}>
            {item.label}
          </Link>
        ))}
        <div className="dl-profile-dd__divider" />
        <button type="button" className="dl-profile-dd__logout" onClick={onLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}
