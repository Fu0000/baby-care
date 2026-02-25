import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isOnboardingCompleted } from '../../lib/onboarding.ts'

export default function RequireOnboarding() {
  const location = useLocation()

  if (!isOnboardingCompleted()) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/onboarding?next=${next}`} replace />
  }

  return <Outlet />
}
