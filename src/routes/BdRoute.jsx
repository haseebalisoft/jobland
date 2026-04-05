import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function BdRoute({ children }) {
  const auth = useAuth()
  if (auth == null) return <div>Loading...</div>
  const { user, loading } = auth

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/bd/login" replace />
  if (user.role !== 'bd' && user.role !== 'admin') return <Navigate to="/login" replace />

  return children
}
