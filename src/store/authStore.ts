import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase, isMissingSupabaseEnv } from '../services/supabaseClient';
import { buildOAuthRedirectUrl, parseNativeAuthCallback } from '../utils/nativeAuth';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/pushRegistration';
import { useTripStore } from './tripStore';
import { useNotificationsStore } from './notificationsStore';

interface AuthStore {
  session: Session | null;
  initialized: boolean;
  authError: string | null;

  initialize: () => void;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signInAsDemoUser: () => void;
  signInAsGuest: (displayName?: string) => void;
  signInSuperadmin: (email: string, password: string) => Promise<boolean>;
  requestSuperadminPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  updateOwnPassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
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

    const storedDemo = typeof localStorage !== 'undefined' ? localStorage.getItem('trip_tracker_demo_session') : null;
    if (storedDemo) {
      try {
        const parsed = JSON.parse(storedDemo);
        if (parsed?.user) {
          set({ session: parsed });
          // A demo session is never a real Supabase Auth session -- it
          // can't back is_superadmin()-gated calls (updateUser, RLS
          // writes). Any persisted isSuperadmin from a previous real
          // login doesn't apply here, or the admin UI renders over a
          // session with nothing real behind it.
          if (useTripStore.getState().isSuperadmin) {
            useTripStore.getState().setIsSuperadmin(false);
          }
          return;
        }
      } catch {
        // ignore invalid JSON
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (data?.session) {
        set({ session: data.session });
        useNotificationsStore.getState().initialize(data.session.user.id);
      }

      // A persisted `isSuperadmin=true` (tripStore survives reloads via
      // IndexedDB) is only trustworthy if today's real session still
      // passes is_superadmin() -- closes the "flip it in devtools/
      // localStorage" gap without ever auto-elevating a Google session
      // that never went through the admin login path in the first place.
      if (useTripStore.getState().isSuperadmin && !isMissingSupabaseEnv) {
        if (!data?.session) {
          useTripStore.getState().setIsSuperadmin(false);
        } else {
          try {
            const { data: verified } = await supabase.rpc('is_superadmin');
            if (!verified) useTripStore.getState().setIsSuperadmin(false);
          } catch {
            useTripStore.getState().setIsSuperadmin(false);
          }
        }
      }
    }).catch(() => {
      // ignore network errors for offline/dummy supabase
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (session === null && event !== 'SIGNED_OUT') return;
      set({ session });
      if (session?.user) {
        registerForPushNotifications(session.user.id);
        useNotificationsStore.getState().initialize(session.user.id);
      }
    });

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        const res = parseNativeAuthCallback(url);
        if (!res) return;
        try {
          await Browser.close();
        } catch {
          // In-app browser may already be closed
        }
        if (res.type === 'code') {
          const { data, error } = await supabase.auth.exchangeCodeForSession(res.code);
          if (error) {
            set({ authError: error.message });
          } else if (data?.session) {
            set({ session: data.session, authError: null });
          }
        } else if (res.type === 'token') {
          const { data, error } = await supabase.auth.setSession({
            access_token: res.accessToken,
            refresh_token: res.refreshToken,
          });
          if (error) {
            set({ authError: error.message });
          } else if (data?.session) {
            set({ session: data.session, authError: null });
          }
        }
      });
    }
  },

  signInAsDemoUser: () => {
    const demoSession: Session = {
      access_token: 'demo-access-token',
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: 'demo-refresh-token',
      user: {
        id: 'demo-user-superadmin',
        app_metadata: { provider: 'demo' },
        user_metadata: { full_name: 'Demo Superadmin', name: 'Demo Superadmin' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'superadmin@triptracker.local',
      },
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('trip_tracker_demo_session', JSON.stringify(demoSession));
    }
    set({ session: demoSession, authError: null });
  },

  signInWithGoogle: async (redirectPath = '/') => {
    set({ authError: null });
    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = buildOAuthRedirectUrl(isNative, window.location.origin, redirectPath);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
          ...(isNative ? { skipBrowserRedirect: true } : {}),
        },
      });

      if (error) {
        set({ authError: `${error.message}. (Tip: If Google OAuth keys are not configured in your Supabase project, you can use "Continue as Guest" or "⚡ Super User Login" to test locally.)` });
        return;
      }

      if (isNative && data?.url) {
        await Browser.open({ url: data.url });
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

  signInSuperadmin: async (email: string, password: string) => {
    // Without a real Supabase project there's nothing to authenticate
    // against — accept any credentials for the local-only mock session so
    // the portal stays demoable offline (same trust level as Guest/Demo).
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
      useTripStore.getState().setIsSuperadmin(true);
      return true;
    }

    // Real superadmin identity (see supabase/migrations/0057_superadmin_identity_and_rls.sql):
    // sign in with whatever the caller typed -- no shared/hardcoded account
    // -- then require the RLS-side is_superadmin() check to pass before
    // granting the admin UI. A successful password sign-in alone is not
    // enough: any registered user could type their own real credentials.
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      set({ authError: error?.message || 'Invalid email or password.' });
      return false;
    }

    const { data: verified, error: rpcError } = await supabase.rpc('is_superadmin');
    if (rpcError || !verified) {
      await supabase.auth.signOut();
      set({ session: null, authError: 'This account is not authorized as a superadmin.' });
      return false;
    }

    set({ session: data.session, authError: null });
    useTripStore.getState().setIsSuperadmin(true);
    return true;
  },

  requestSuperadminPasswordReset: async (email: string) => {
    if (isMissingSupabaseEnv) {
      return { success: false, message: 'Password reset needs a real Supabase project configured.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: `If ${email} is registered, a reset link has been sent.` };
  },

  // Used from inside the Admin Portal (already authenticated) so an admin
  // can rotate their own password without leaving the session -- separate
  // from requestSuperadminPasswordReset, which is the logged-out flow.
  updateOwnPassword: async (newPassword: string) => {
    if (isMissingSupabaseEnv) {
      return { success: false, message: 'Password change needs a real Supabase project configured.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Password updated.' };
  },

  signOut: async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('trip_tracker_demo_session');
    }
    const userId = get().session?.user.id;
    if (userId) {
      await unregisterPushNotifications(userId);
    }
    useNotificationsStore.getState().teardown();
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors on signout
    }
    useTripStore.getState().setIsSuperadmin(false);
    set({ session: null });
  },

  clearAuthError: () => set({ authError: null }),
}));
