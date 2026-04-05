import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isPaywallBlocking } from '../utils/subscription.js';

/** Paid subscribers only; free tier users are sent to Score Resume (new dashboard shell) */
export default function PaidRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth == null) {
    return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading…</div>;
  }
  const { user, loading } = auth;

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isPaywallBlocking(user)) {
    const from = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`/dashboard/score-resume?upgrade=1&from=${encodeURIComponent(from)}`} replace />;
  }

  return children;
}
