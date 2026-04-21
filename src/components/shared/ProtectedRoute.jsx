import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader } from '../ui/Spinner'

export function ProtectedRoute({ children, rolRequerido }) {
  const { session, perfil, cargando } = useAuth()

  if (cargando) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  if (rolRequerido && perfil?.rol !== rolRequerido) {
    return <Navigate to={perfil?.rol === 'admin' ? '/admin' : '/cobrador'} replace />
  }

  return children
}
