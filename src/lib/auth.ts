import { apiRequest } from "./api/client.ts";
import {
  clearAuthSession,
  getAccessToken,
  getAuthSession,
  hasInviteAccess,
  isLoggedIn,
  saveAuthSession,
  setInviteBound,
  AUTH_SESSION_CHANGED_EVENT,
  type AuthSession,
  type AuthUser,
} from "./auth-session.ts";

interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export {
  AUTH_SESSION_CHANGED_EVENT,
  clearAuthSession,
  getAccessToken,
  getAuthSession,
  hasInviteAccess,
  isLoggedIn,
  saveAuthSession,
  setInviteBound,
};
export type { AuthSession, AuthUser };

export async function registerWithPassword(input: {
  phone: string;
  password: string;
  nickname?: string;
}): Promise<AuthSession> {
  const payload = await apiRequest<AuthPayload>("/v1/auth/register", {
    method: "POST",
    body: input,
  });
  saveAuthSession(payload);
  return payload;
}

export async function loginWithPassword(input: {
  phone: string;
  password: string;
}): Promise<AuthSession> {
  const payload = await apiRequest<AuthPayload>("/v1/auth/login", {
    method: "POST",
    body: input,
  });
  saveAuthSession(payload);
  return payload;
}

export async function refreshSession(): Promise<void> {
  const session = getAuthSession();
  if (!session) return;

  const payload = await apiRequest<{ accessToken: string; refreshToken: string }>(
    "/v1/auth/refresh",
    {
      method: "POST",
      body: { refreshToken: session.refreshToken },
      retryOnAuthFailure: false,
    },
  );

  saveAuthSession({
    ...session,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });
}

export async function fetchMe(): Promise<AuthUser> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token");
  }

  const me = await apiRequest<AuthUser>("/v1/auth/me", {
    accessToken: token,
  });

  const session = getAuthSession();
  if (session) {
    saveAuthSession({ ...session, user: me });
  }

  return me;
}

export async function bindInviteCode(code: string): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token");
  }

  await apiRequest<{ inviteBound: boolean; code: string }>("/v1/invites/bind", {
    method: "POST",
    accessToken: token,
    body: { code },
  });

  setInviteBound(true);
}

export async function logout(): Promise<void> {
  const token = getAccessToken();
  if (token) {
    try {
      await apiRequest<void>("/v1/auth/logout", {
        method: "POST",
        accessToken: token,
        retryOnAuthFailure: false,
      });
    } catch {
      // noop: local session will still be cleared
    }
  }

  clearAuthSession();
}

export function getSafeNext(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  return next;
}
