import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { tokenStore } from "./api";
import { authLogin, authRegister } from "./queries";
import type { AuthResult, User } from "./types";

interface AuthCtxValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; name: string; orgName: string }) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthCtxValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const cached = tokenStore.getUser<User>();
    if (cached && tokenStore.get()) setUser(cached);
    setLoading(false);
  }, []);

  const apply = (res: AuthResult) => {
    tokenStore.set(res.accessToken, res.refreshToken);
    const u: User = { id: res.userId, name: res.name, email: res.email, roleName: "ORG_OWNER", roleLevel: 5 };
    tokenStore.setUser(u);
    setUser(u);
  };

  const value: AuthCtxValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login: async (email, password) => apply(await authLogin(email, password)),
    register: async (payload) => apply(await authRegister(payload)),
    logout: () => { tokenStore.clear(); setUser(null); },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
