import { create } from "zustand";
import type { PublicUser } from "@revise-plus/shared";
import { api } from "../lib/api";

function setToken(token: string | null) {
  if (token) localStorage.setItem("rp_token", token);
  else localStorage.removeItem("rp_token");
}

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; username: string; password: string; gradeLevel?: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: PublicUser | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  loaded: false,
  error: null,
  setUser: (u) => set({ user: u }),
  fetchMe: async () => {
    set({ loading: true });
    try {
      const data = await api<{ user: PublicUser }>("/auth/me");
      set({ user: data.user, loaded: true, loading: false, error: null });
    } catch (e) {
      setToken(null);
      set({ user: null, loaded: true, loading: false });
    }
  },
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await api<{ user: PublicUser; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      set({ user: data.user, loading: false, loaded: true });
    } catch (e: any) {
      set({ loading: false, error: e?.message || "Erreur de connexion" });
      throw e;
    }
  },
  register: async (input) => {
    set({ loading: true, error: null });
    try {
      const data = await api<{ user: PublicUser; token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setToken(data.token);
      set({ user: data.user, loading: false, loaded: true });
    } catch (e: any) {
      set({ loading: false, error: e?.message || "Erreur d'inscription" });
      throw e;
    }
  },
  logout: async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {}
    setToken(null);
    set({ user: null });
  },
}));
