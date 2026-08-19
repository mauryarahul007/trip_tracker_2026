import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../services/supabaseClient';
import { buildOAuthRedirectUrl, parseNativeAuthCallback } from '../utils/nativeAuth';
import { registerForPushNotifications, unregisterPushNotifications } from '../services/pushRegistration';
import { useNotificationsStore } from './notificationsStore';

interface AuthStore {
  session: Session | null;
  initialized: boolean;
  authError: string | null;

  initialize: () => void;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
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
      set({ session: data.session });
      if (data.session?.user) {
        useNotificationsStore.getState().initialize(data.session.user.id);
      }
    });

    supabase.auth.onAuthStateChange((event, session) => {
      // Supabase's GoTrueClient re-checks/refreshes the session around
      // network and tab-visibility changes internally, and can fire this
      // callback with a null session for a purely transient reason (e.g. a
      // background token-refresh attempt failing while briefly offline) —
      // not because the user actually signed out. RequireAuth redirects to
      // /login the instant `session` is falsy with no grace period, so
      // accepting every null here made toggling offline/online flash the
      // whole app (trips, members, groups, expenses — everything behind
      // the auth gate) to the login screen and back. Only ever clear a
      // session we already have on an explicit sign-out.
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
    const userId = get().session?.user.id;
    // Must run BEFORE auth.signOut() — device_push_tokens RLS requires
    // an authenticated session (user_id = auth.uid()), so deleting the
    // token after deauthenticating would silently match zero rows and
    // leave the device registered to receive this user's notifications.
    if (userId) {
      await unregisterPushNotifications(userId);
    }
    useNotificationsStore.getState().teardown();
    await supabase.auth.signOut();
    set({ session: null });
  },

  clearAuthError: () => set({ authError: null }),
}));
