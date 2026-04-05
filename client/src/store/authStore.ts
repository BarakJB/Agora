import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as api from '../services/api';

export type UserMode = 'demo' | 'new';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  role: string;
  taxStatus: 'self_employed' | 'employee';
}

interface AuthState {
  isAuthenticated: boolean;
  userMode: UserMode | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  loginDemo: () => void;
  loginWithApi: (email: string, password: string) => Promise<void>;
  registerWithApi: (payload: { name: string; email: string; phone?: string; licenseNumber?: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const DEMO_PROFILE: UserProfile = {
  id: 'a0000001-0000-0000-0000-000000000001',
  name: 'דניאל אהרוני',
  email: 'd.aharoni@payagent.co.il',
  phone: '054-9876543',
  licenseNumber: '052-998432-1',
  role: 'סוכן פנסיוני בכיר',
  taxStatus: 'self_employed',
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userMode: null,
      profile: null,
      token: null,
      loading: false,
      error: null,

      loginDemo: () => {
        set({
          isAuthenticated: true,
          userMode: 'demo',
          profile: DEMO_PROFILE,
          token: null,
          error: null,
        });
      },

      loginWithApi: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await api.login(email, password);
          if (!res.data) throw new Error('תגובה ריקה מהשרת');

          const { token, agent } = res.data;
          localStorage.setItem('payagent-token', token);

          set({
            isAuthenticated: true,
            userMode: 'new',
            token,
            profile: {
              id: agent.id,
              name: agent.name,
              email: agent.email,
              phone: agent.phone,
              licenseNumber: agent.licenseNumber,
              role: 'סוכן',
              taxStatus: (agent.taxStatus as 'self_employed' | 'employee') || 'self_employed',
            },
            loading: false,
          });
        } catch (err) {
          const message = err instanceof api.ApiError
            ? (err.status === 401 ? 'אימייל או סיסמה שגויים' : err.serverError || 'שגיאת שרת')
            : 'לא ניתן להתחבר לשרת. ודא שהשרת פועל.';
          set({ loading: false, error: message });
          throw err;
        }
      },

      registerWithApi: async (payload) => {
        set({ loading: true, error: null });
        try {
          const res = await api.register(payload);
          if (!res.data) throw new Error('תגובה ריקה מהשרת');

          const { token, agent } = res.data;
          localStorage.setItem('payagent-token', token);

          set({
            isAuthenticated: true,
            userMode: 'new',
            token,
            profile: {
              id: agent.id,
              name: agent.name,
              email: agent.email,
              phone: agent.phone,
              licenseNumber: agent.licenseNumber,
              role: 'סוכן חדש',
              taxStatus: (agent.taxStatus as 'self_employed' | 'employee') || 'self_employed',
            },
            loading: false,
          });
        } catch (err) {
          const message = err instanceof api.ApiError
            ? (err.serverError || 'שגיאה ביצירת חשבון')
            : 'לא ניתן להתחבר לשרת. ודא שהשרת פועל.';
          set({ loading: false, error: message });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('payagent-token');
        set({ isAuthenticated: false, userMode: null, profile: null, token: null, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'payagent-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userMode: state.userMode,
        profile: state.profile,
        token: state.token,
      }),
    },
  ),
);
