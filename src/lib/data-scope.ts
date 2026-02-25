import { useEffect, useState } from 'react'
import { AUTH_SESSION_CHANGED_EVENT, getAuthSession } from './auth-session.ts'

export function getCurrentUserId(): string | null {
  return getAuthSession()?.user.id ?? null
}

export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(getCurrentUserId())

  useEffect(() => {
    function handleAuthChange() {
      setUserId(getCurrentUserId())
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthChange)
    return () => window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleAuthChange)
  }, [])

  return userId
}
