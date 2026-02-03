import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { name: string; rating: number } | null;
  isLoading: boolean;
  error: string | null;

  setToken(token: string): void;
  setUser(user: AuthState['user']): void;
  setError(error: string | null): void;
  setLoading(isLoading: boolean): void;
  logout(): void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,
  setToken: (token) => set({ token, error: null }),
  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ token: null, user: null, error: null }),
}));
