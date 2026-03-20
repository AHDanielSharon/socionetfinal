import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, tokenStore } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email?: string;
  full_name: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  is_verified: boolean;
  is_private: boolean;
  is_creator: boolean;
  followers_count: number;
  following_count: number;
  posts_count: number;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: Partial<User>) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) => {
        tokenStore.setTokens(accessToken, refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (updates) => {
        const user = get().user;
        if (user) set({ user: { ...user, ...updates } });
      },

      logout: () => {
        tokenStore.clear();
        api.auth.logout().catch(() => {});
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
      },

      fetchMe: async () => {
        try {
          set({ isLoading: true });
          const res = await api.auth.me();
          const { user: me } = res.data;
          delete me.password_hash;
          set({ user: me, isAuthenticated: true });
        } catch {
          // Token invalid - clear state but don't redirect (let middleware handle it)
          tokenStore.clear();
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'socionet-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-sync token store from persisted state
        if (state?.accessToken && state?.refreshToken) {
          tokenStore.setTokens(state.accessToken, state.refreshToken);
        }
      },
    }
  )
);
