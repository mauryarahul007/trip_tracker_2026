import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../services/supabaseClient';
import { buildOAuthRedirectUrl, parseNativeAuthCallback } from '../utils/nativeAuth';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/pushRegistration';

interface AuthStore {
  session: Session | null;
  initialized: boolean;
  authError: string | null;

  initialize: () => void;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signInAsDemoUser: () => void;
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
          return;
        }
      } catch {
        // ignore invalid JSON
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        set({ session: data.session });
      }
    }).catch(() => {
      // ignore network errors for offline/dummy supabase
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (session === null && event !== 'SIGNED_OUT') return;
      set({ session });
      if (session?.user) {
        registerForPushNotifications(session.user.id);
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
      set({ authError: error.message });
      return;
    }

    if (isNative && data?.url) {
      await Browser.open({ url: data.url });
    }
  },

  signOut: async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('trip_tracker_demo_session');
    }
    const userId = get().session?.user.id;
    if (userId) {
      await unregisterPushNotifications(userId);
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    set({ session: null });
  },

  clearAuthError: () => set({ authError: null }),
}));
