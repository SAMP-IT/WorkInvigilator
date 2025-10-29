import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../lib/supabase';
import { mockAdminUser, mockEmployeeUser } from '../lib/mockData';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setProfile: (profile) => set({ profile }),

      setLoading: (loading) => set({ isLoading: loading }),

      login: async (email: string, _password: string) => {
        console.log('[AuthStore] Mock login with:', email);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock authentication - accept any email/password
        // Default to admin user, or employee user if email contains "employee"
        const mockUser = email.includes('employee') ? mockEmployeeUser : mockAdminUser;

        set({
          user: mockUser.user,
          profile: { ...mockUser.profile, updated_at: mockUser.profile.created_at } as Profile,
          isAuthenticated: true,
          isLoading: false,
        });

        console.log('[AuthStore] Mock login successful as:', mockUser.profile.role);
      },

      initialize: async () => {
        console.log('[AuthStore] Initializing with mock data...');
        try {
          set({ isLoading: true });

          // Check if user is already logged in from storage
          const currentState = get();
          if (currentState.user) {
            console.log('[AuthStore] User found in storage:', currentState.user.email);
            set({ isLoading: false });
          } else {
            console.log('[AuthStore] No user found, ready for login');
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('[AuthStore] Error initializing auth:', error);
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      logout: async () => {
        console.log('[AuthStore] Logging out...');
        set({
          user: null,
          profile: null,
          isAuthenticated: false
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
