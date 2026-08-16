import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, isMissingSupabaseEnv } from '../services/supabaseClient';
import { SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } from '../utils/superadminAuth';

interface AuthStore {
  session: Session | null;
  initialized: boolean;
  authError: string | null;

  initialize: () => void;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signInAsGuest: (displayName?: string) => void;
  setSuperadminSession: (email?: string) => Promise<void>;
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

  setSuperadminSession: async (email = SUPERADMIN_EMAIL) => {
    // Without a real Supabase project there's nothing to authenticate
    // against — fall back to the old local-only mock session so the
    // portal is still demoable offline.
    if (isMissingSupabaseEnv) {
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
      return;
    }

    // Real superadmin identity (see supabase/migrations/0045_superadmin_identity_and_rls.sql):
    // this must be a genuine Supabase Auth session so RLS's is_superadmin()
    // recognizes it — a faked session can't pass auth.uid() checks.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
    });
    if (error || !data.session) {
      const message = error?.message || 'Failed to establish superadmin session.';
      set({ authError: message });
      throw new Error(message);
    }
    set({ session: data.session, authError: null });
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
