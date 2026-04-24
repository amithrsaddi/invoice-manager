import React, { createContext, useState, useContext, useEffect } from 'react';
import { db } from "@/api/dbClient";
import { queryClientInstance } from "@/lib/query-client";

type User = { id: string; email: string; name: string };
type AuthError = { type: string; message: string } | null;
type AuthCredentials = { email: string; password: string };
type RegisterPayload = AuthCredentials & { name: string };
type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingPublicSettings: boolean;
  authError: AuthError;
  appPublicSettings: unknown;
  authChecked: boolean;
  logout: () => void;
  login: (credentials: AuthCredentials) => Promise<User | undefined>;
  register: (payload: RegisterPayload) => Promise<User | undefined>;
  navigateToLogin: () => void;
  checkUserAuth: () => Promise<void>;
  checkAppState: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    await checkUserAuth();
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await db.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
      setAuthError(null);
    } catch (_error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setAuthError({ type: "auth_required", message: "Please login" });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (credentials: AuthCredentials) => {
    const loggedUser = await db.auth.login(credentials);
    queryClientInstance.clear();
    setUser(loggedUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return loggedUser;
  };

  const register = async (payload: RegisterPayload) => {
    const createdUser = await db.auth.register(payload);
    queryClientInstance.clear();
    setUser(createdUser);
    setIsAuthenticated(true);
    setAuthChecked(true);
    setAuthError(null);
    return createdUser;
  };

  const logout = () => {
    queryClientInstance.clear();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: "auth_required", message: "Logged out" });
    db.auth.logout();
  };

  const navigateToLogin = () => {
    return;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      login,
      register,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
