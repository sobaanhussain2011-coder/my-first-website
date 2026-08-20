import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setToken, type Me } from "./api";

type Ctx = {
  user: Me | null;
  ready: boolean;
  refresh: () => Promise<void>;
  becomeGuest: (name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Auth = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    try {
      const data = await api.me();
      if (data.token) setToken(data.token);
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  async function becomeGuest(name?: string) {
    const data = await api.guest(name);
    setToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setToken(null);
    setUser(null);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setToken(token);
      window.history.replaceState({}, "", "/");
    }
    void refresh();
  }, []);

  return (
    <Auth.Provider value={{ user, ready, refresh, becomeGuest, logout }}>
      {children}
    </Auth.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Auth);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
