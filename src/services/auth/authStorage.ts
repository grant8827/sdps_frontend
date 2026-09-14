import type { AuthSession } from '../../types';

/**
 * Persists the auth session using the browser's localStorage — the
 * web equivalent of mobile_app's react-native-encrypted-storage. Same
 * async-shaped API so AuthContext is a straight port between clients.
 */
const SESSION_KEY = 'sdp.auth.session';

export async function saveSession(session: AuthSession): Promise<void> {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<AuthSession | null> {
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as AuthSession) : null;
}

export async function clearSession(): Promise<void> {
  window.localStorage.removeItem(SESSION_KEY);
}

export function isSessionExpired(session: AuthSession): boolean {
  return Date.now() >= session.expiresAt;
}
