import { create } from 'zustand';
import type { User } from '@/types';
import { loginWithGoogle, fetchCurrentUser, logout } from '@/services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {
    const ok = await loginWithGoogle();
    if (ok) {
      await useAuthStore.getState().loadUser();
    }
  },
  loadUser: async () => {
    try {
      const user = await fetchCurrentUser();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    await logout();
    set({ user: null, isAuthenticated: false });
  },
}));
