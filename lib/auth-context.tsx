import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";
import { fetch } from "expo/fetch";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  phone?: string;
  college?: string;
  photoUrl?: string;
  skills?: string;
  isActive: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  adminLogin: (email: string, password: string, adminKey: string) => Promise<User>;
  register: (email: string, password: string, name: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    await AsyncStorage.setItem("auth_token", accessToken);
    await AsyncStorage.setItem("refresh_token", refreshToken);
    setToken(accessToken);
  }, []);

  const clearTokens = useCallback(async () => {
    await AsyncStorage.multiRemove(["auth_token", "refresh_token"]);
    setToken(null);
    setUser(null);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const storedRefresh = await AsyncStorage.getItem("refresh_token");
      if (!storedRefresh) return false;

      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/auth/refresh", baseUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (res.ok) {
        const data = await res.json();
        await saveTokens(data.token, data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [saveTokens]);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem("auth_token");
      if (storedToken) {
        setToken(storedToken);
        const baseUrl = getApiUrl();
        const res = await fetch(new URL("/api/auth/me", baseUrl).toString(), {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else if (res.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            const newToken = await AsyncStorage.getItem("auth_token");
            if (newToken) {
              const retryRes = await fetch(new URL("/api/auth/me", baseUrl).toString(), {
                headers: { Authorization: `Bearer ${newToken}` },
              });
              if (retryRes.ok) {
                const userData = await retryRes.json();
                setUser(userData);
              } else {
                await clearTokens();
              }
            }
          } else {
            await clearTokens();
          }
        }
      }
    } catch (e) {
      console.error("Failed to load auth:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<User> {
    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/auth/login", baseUrl).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    await saveTokens(data.token, data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function adminLogin(email: string, password: string, adminKey: string): Promise<User> {
    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/auth/secure-admin-auth", baseUrl).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, adminKey }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    await saveTokens(data.token, data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function register(email: string, password: string, name: string): Promise<User> {
    const baseUrl = getApiUrl();
    const res = await fetch(new URL("/api/auth/register", baseUrl).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role: "student" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    await saveTokens(data.token, data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await clearTokens();
  }

  async function refreshUser() {
    const currentToken = await AsyncStorage.getItem("auth_token");
    if (!currentToken) return;
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/auth/me", baseUrl).toString(), {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else if (res.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) await clearTokens();
      }
    } catch (e) {
      console.error("Failed to refresh user:", e);
    }
  }

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    login,
    adminLogin,
    register,
    logout,
    refreshUser,
    refreshAccessToken,
  }), [user, token, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
