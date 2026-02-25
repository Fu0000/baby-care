const AUTH_KEY = "babycare-auth-session";
export const AUTH_SESSION_CHANGED_EVENT = "babycare:auth-session-changed";

export interface AuthUser {
  id: string;
  phone: string;
  nickname: string | null;
  inviteBound: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  emitAuthSessionChanged();
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_KEY);
  emitAuthSessionChanged();
}

export function isLoggedIn(): boolean {
  return !!getAuthSession()?.accessToken;
}

export function hasInviteAccess(): boolean {
  const session = getAuthSession();
  return !!session && session.user.inviteBound;
}

export function getAccessToken(): string | null {
  return getAuthSession()?.accessToken ?? null;
}

export function setInviteBound(inviteBound: boolean): void {
  const session = getAuthSession();
  if (!session) return;
  saveAuthSession({
    ...session,
    user: {
      ...session.user,
      inviteBound,
    },
  });
}

function emitAuthSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT));
}
