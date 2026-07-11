'use client';

import type { AuthSession, AuthUser } from '@mixoraone/contracts';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { logout as apiLogout, refreshSession } from '@/lib/api-client/auth';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /** True until the initial silent refresh finishes. */
  loading: boolean;
  applySession: (session: AuthSession) => void;
  /** Updates the cached user after profile changes without new tokens. */
  applySessionUser: (user: AuthUser) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Access tokens live only in memory (ADR 0002); on mount we silently exchange
 * the httpOnly refresh cookie for a session, and re-run before expiry.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((expiresInSeconds: number) => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
    }
    const delayMs = Math.max((expiresInSeconds - 60) * 1000, 30_000);
    refreshTimer.current = setTimeout(() => {
      void refreshSession()
        .then((session) => {
          setUser(session.user);
          setAccessToken(session.tokens.accessToken);
          scheduleRefresh(session.tokens.expiresIn);
        })
        .catch(() => {
          setUser(null);
          setAccessToken(null);
        });
    }, delayMs);
  }, []);

  const applySession = useCallback(
    (session: AuthSession) => {
      setUser(session.user);
      setAccessToken(session.tokens.accessToken);
      scheduleRefresh(session.tokens.expiresIn);
    },
    [scheduleRefresh],
  );

  const applySessionUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refreshSession()
      .then((session) => {
        if (!cancelled) {
          applySession(session);
        }
      })
      .catch(() => {
        // No valid refresh cookie; the visitor is signed out.
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
      }
    };
  }, [applySession]);

  const value = useMemo(
    () => ({ user, accessToken, loading, applySession, applySessionUser, signOut }),
    [user, accessToken, loading, applySession, applySessionUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
