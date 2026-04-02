import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isFreePlanUser } from '../utils/subscription.js';

/** Paid subscribers only; free tier users are sent to /free-tools */
export default function PaidRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isFreePlanUser(user)) {
    const from = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/free-tools?upgrade=1&from=${encodeURIComponent(from)}`} replace />;
  }

  return children;
}
