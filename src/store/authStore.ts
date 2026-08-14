import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

interface AuthStore {
  session: Session | null;
  initialized: boolean;
  authError: string | null;

  initialize: () => void;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signInAsGuest: (displayName?: string) => void;
  setSuperadminSession: (email?: string) => void;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  initialized: false,
  authError: null,

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        set({ session: data.session });
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        set({ session });
      }
    });
  },

  signInWithGoogle: async (redirectPath = '/') => {
    set({ authError: null });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
        },
      });
      if (error) {
        set({ authError: `${error.message}. (Tip: If Google OAuth keys are not configured in your Supabase project, you can use "Continue as Guest" or "⚡ Super User Login" to test locally.)` });
      }
    } catch (e: any) {
      set({ authError: e?.message || 'Failed to connect to Google authentication provider.' });
    }
  },

  signInAsGuest: (displayName = 'Rahul (Traveler)') => {
    const mockSession = {
      access_token: 'guest-local-token',
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: 'guest-refresh-token',
      user: {
        id: 'guest-traveler-user-id',
        app_metadata: { provider: 'guest' },
        user_metadata: { full_name: displayName, name: displayName },
        aud: 'authenticated',
        email: 'rahul@traveler.local',
        created_at: new Date().toISOString(),
      },
    } as unknown as Session;
    set({ session: mockSession, authError: null });
  },

  setSuperadminSession: (email = 'Superadmin@triptracker.com') => {
    const mockSession = {
      access_token: 'superadmin-local-token',
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: 'superadmin-refresh-token',
      user: {
        id: 'superadmin-root-user-id',
        app_metadata: { provider: 'superadmin' },
        user_metadata: { full_name: 'Super Admin', name: 'Super Admin' },
        aud: 'authenticated',
        email,
        created_at: new Date().toISOString(),
      },
    } as unknown as Session;
    set({ session: mockSession, authError: null });
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on signout
    }
    set({ session: null });
  },

  clearAuthError: () => set({ authError: null }),
}));
