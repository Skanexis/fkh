import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, configureApiAuth } from "../api/client";
import { ApiUser } from "../api/types";

interface TelegramLoginStart {
  authRequestId: string;
  botStartUrl: string;
  expiresAt: string;
}

interface TelegramLoginStatus {
  status: "pending" | "confirmed" | "expired" | "cancelled" | "consumed";
  user?: ApiUser;
  accessToken?: string;
  refreshToken?: string;
}

interface AuthContextValue {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  startTelegramLogin: () => Promise<TelegramLoginStart>;
  pollTelegramLogin: (authRequestId: string) => Promise<TelegramLoginStatus>;
  refreshSession: () => Promise<boolean>;
  loadMe: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_KEY = "fkh_access_token";
const REFRESH_KEY = "fkh_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(ACCESS_KEY));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem(REFRESH_KEY));
  const [loading, setLoading] = useState(true);

  const persistTokens = useCallback((nextAccess: string | null, nextRefresh: string | null) => {
    setAccessToken(nextAccess);
    setRefreshToken(nextRefresh);

    if (nextAccess) localStorage.setItem(ACCESS_KEY, nextAccess);
    else localStorage.removeItem(ACCESS_KEY);

    if (nextRefresh) localStorage.setItem(REFRESH_KEY, nextRefresh);
    else localStorage.removeItem(REFRESH_KEY);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem(REFRESH_KEY);
    if (!token) return false;

    try {
      const data = await apiRequest<{ accessToken: string; refreshToken: string }>(
        "/api/v1/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken: token }),
        },
        false,
      );
      persistTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      persistTokens(null, null);
      setUser(null);
      return false;
    }
  }, [persistTokens]);

  useEffect(() => {
    configureApiAuth(() => localStorage.getItem(ACCESS_KEY), refreshSession);
  }, [refreshSession]);

  const loadMe = useCallback(async () => {
    if (!localStorage.getItem(ACCESS_KEY)) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const me = await apiRequest<ApiUser>("/api/v1/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [accessToken, loadMe]);

  const startTelegramLogin = useCallback(() => {
    return apiRequest<TelegramLoginStart>("/api/v1/auth/telegram/start", {
      method: "POST",
      body: JSON.stringify({}),
    });
  }, []);

  const pollTelegramLogin = useCallback(
    async (authRequestId: string) => {
      const status = await apiRequest<TelegramLoginStatus>(`/api/v1/auth/telegram/status/${authRequestId}`);
      if (status.status === "confirmed" && status.accessToken && status.refreshToken && status.user) {
        persistTokens(status.accessToken, status.refreshToken);
        setUser(status.user);
      }
      return status;
    },
    [persistTokens],
  );

  const logout = useCallback(async () => {
    const token = refreshToken;
    persistTokens(null, null);
    setUser(null);
    if (token) {
      await apiRequest("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: token }),
      }).catch(() => undefined);
    }
  }, [persistTokens, refreshToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      loading,
      startTelegramLogin,
      pollTelegramLogin,
      refreshSession,
      loadMe,
      logout,
    }),
    [user, loading, startTelegramLogin, pollTelegramLogin, refreshSession, loadMe, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
