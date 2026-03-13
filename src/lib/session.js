const SESSION_STORAGE_KEY = 'klinika-front-session';

export function readStoredSession() {
  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

export function writeStoredSession(session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = window.atob(padded);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function createSession(loginResponse, worker, roleSlugByApiRole) {
  const roleSlug = roleSlugByApiRole[loginResponse.role] || roleSlugByApiRole[worker?.role];

  return {
    token: loginResponse.token,
    email: loginResponse.email,
    role: loginResponse.role,
    roleSlug,
    worker,
    tokenPayload: decodeJwtPayload(loginResponse.token),
    authenticatedAt: new Date().toISOString(),
  };
}

export function isSessionExpired(session) {
  const exp = session?.tokenPayload?.exp;

  if (!exp) {
    return false;
  }

  return Date.now() >= exp * 1000;
}