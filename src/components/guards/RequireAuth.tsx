import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAuthSession } from '../../lib/auth.ts'

export default function RequireAuth() {
  const location = useLocation()
  const session = getAuthSession()
  const next = encodeURIComponent(location.pathname + location.search)

  if (!session?.accessToken) {
    return <Navigate to={`/auth/login?next=${next}`} replace />
  }

  if (!session.user.inviteBound) {
    return <Navigate to={`/invite/bind?next=${next}`} replace />
  }

  return <Outlet />
}
