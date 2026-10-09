import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isMfaChallenge, type AuthSession, type MfaChallenge, type User } from '../types';
import {
  clearSession,
  isSessionExpired,
  loadSession,
  saveSession,
} from '../services/auth/authStorage';
import { api, onUnauthorized, setActiveSchoolId, type SupportSession } from '../services/api';

const ADMIN_ROLES = ['school_admin', 'district_admin', 'platform_super_admin'];
const DASHBOARD_ROLES = [...ADMIN_ROLES, 'staff'];
const activeSchoolKey = (userId: string) => `activeSchool:${userId}`;

interface AuthContextValue {
  user: User | null;
  token: string | null;
  /** True while the persisted session is being restored on app launch. */
  isRestoring: boolean;
  isAuthenticating: boolean;
  /**
   * Password step. Resolves null once signed in, or with the challenge
   * when a two-step verification code (or setup) is still needed — the
   * screen completes that and then calls adoptSession.
   */
  login: (identifier: string, password: string) => Promise<MfaChallenge | null>;
  /** Adopts a session already issued by the backend (e.g. right after registering a new school) without re-submitting credentials. */
  adoptSession: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * False for front desk / office staff: they share the admin console
   * but the backend only lets them read, so screens hide the add/
   * suspend/delete controls and the admin-only sections. A session
   * saved before memberships were part of it counts as true — the
   * backend still enforces the real rule either way.
   */
  canManageSchool: boolean;
  /** Schools this admin-dashboard user can work in (more than one for a district admin). */
  schools: { schoolId: string; schoolName: string }[];
  /** The school the admin dashboard is showing and acting on. */
  activeSchoolId: string | null;
  setActiveSchool: (schoolId: string) => void;
  isDistrictAdmin: boolean;
  /** Platform administrator role (people who run SDPMPlus), or null. */
  platformRole: string | null;
  /** Whether this platform admin's role includes a permission (the API checks it again). */
  can: (permission: string) => boolean;
  /** Open support session into one school, if any — the admin screens then show that school. */
  supportSession: SupportSession | null;
  startSupport: (schoolId: string, reason: string, allowChanges: boolean) => Promise<void>;
  exitSupport: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // "App automatically routes users upon login, restores + checks
  // session expiry." Restoring/expiry checks happen here; wire an
  // actual refresh-token call in once the backend exists.
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadSession();
        if (stored && !isSessionExpired(stored)) {
          setSession(stored);
        } else if (stored) {
          await clearSession();
        }
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setIsAuthenticating(true);
    try {
      const result = await api.login(identifier, password);
      if (isMfaChallenge(result)) return result;
      await saveSession(result);
      setSession(result);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const adoptSession = useCallback(async (newSession: AuthSession) => {
    await saveSession(newSession);
    setSession(newSession);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  // A 401 from any API call means the server has stopped honoring this
  // token — drop the local session so the login screen comes back up,
  // instead of leaving stale screens quietly showing empty state.
  useEffect(() => {
    onUnauthorized(() => {
      clearSession();
      setSession(null);
    });
  }, []);

  // Admin-dashboard schools, de-duplicated (someone can be both a
  // school admin and a district admin of the same school).
  const memberships = session?.user.memberships;
  const schools = useMemo(() => {
    if (session?.user.role !== 'admin' || !memberships) return [];
    const byId = new Map<string, string>();
    for (const m of memberships) if (DASHBOARD_ROLES.includes(m.role) && !byId.has(m.schoolId)) byId.set(m.schoolId, m.schoolName ?? m.schoolId);
    return [...byId].map(([schoolId, schoolName]) => ({ schoolId, schoolName }));
  }, [session?.user.role, memberships]);

  const [chosenSchoolId, setChosenSchoolId] = useState<string | null>(null);
  useEffect(() => {
    if (!session) { setChosenSchoolId(null); return; }
    let saved: string | null = null;
    try { saved = localStorage.getItem(activeSchoolKey(session.user.id)); } catch { /* storage blocked */ }
    setChosenSchoolId(saved);
  }, [session]);
  const activeSchoolId = schools.length > 1
    ? (schools.some(s => s.schoolId === chosenSchoolId) ? chosenSchoolId : schools[0].schoolId)
    : null;

  const setActiveSchool = useCallback((schoolId: string) => {
    if (session) { try { localStorage.setItem(activeSchoolKey(session.user.id), schoolId); } catch { /* storage blocked */ } }
    setChosenSchoolId(schoolId);
  }, [session]);

  // Platform admins: the current support session comes from the server
  // (it survives a page reload), and is dropped when it expires.
  const platform = session?.user.platform ?? null;
  const [supportSession, setSupportSession] = useState<SupportSession | null>(null);
  // Until the server has said whether a support session is open, the
  // router can't know where a platform admin belongs — keep restoring.
  const [checkedToken, setCheckedToken] = useState<string | null>(null);
  const token = session?.token ?? null;
  const platformChecked = !platform || checkedToken === token;
  useEffect(() => {
    setSupportSession(null);
    if (!token || !platform) return;
    api.platformMe(token)
      .then(me => setSupportSession(me.supportSession))
      .catch(() => {})
      .finally(() => setCheckedToken(token));
  }, [token, platform]);
  useEffect(() => {
    if (!supportSession) return;
    const timer = setTimeout(() => setSupportSession(null), Math.max(0, supportSession.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [supportSession]);
  const startSupport = useCallback(async (schoolId: string, reason: string, allowChanges: boolean) => {
    if (!token) return;
    setSupportSession(await api.startSupportSession(token, { schoolId, reason, allowChanges }));
  }, [token]);
  const exitSupport = useCallback(async () => {
    if (token) await api.endSupportSession(token).catch(() => {});
    setSupportSession(null);
  }, [token]);
  const can = useCallback((permission: string) => Boolean(platform?.permissions.includes(permission)), [platform]);

  // Set synchronously during render so the first requests already carry
  // it. In a support session the server already knows the school.
  setActiveSchoolId(supportSession ? null : activeSchoolId);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isRestoring: isRestoring || !platformChecked,
      isAuthenticating,
      login,
      adoptSession,
      logout,
      // In a support session, controls that change data show only when changes were allowed.
      canManageSchool: supportSession ? supportSession.allowChanges : !memberships
        || memberships.some(m => ADMIN_ROLES.includes(m.role) && (!activeSchoolId || m.schoolId === activeSchoolId)),
      schools,
      activeSchoolId,
      setActiveSchool,
      isDistrictAdmin: Boolean(memberships?.some(m => m.role === 'district_admin')),
      platformRole: platform?.role ?? null,
      can,
      supportSession,
      startSupport,
      exitSupport,
    }),
    [session, memberships, isRestoring, platformChecked, isAuthenticating, login, adoptSession, logout, schools, activeSchoolId, setActiveSchool, platform, can, supportSession, startSupport, exitSupport],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
