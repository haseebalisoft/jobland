import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminRoute({ children }) {
  const auth = useAuth();
  if (auth == null) return <div>Loading...</div>;
  const { user, loading } = auth;

  if (loading) return <div>Loading...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;

  return children;
}

