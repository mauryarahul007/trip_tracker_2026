import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../services/supabaseClient';
import { buildOAuthRedirectUrl, parseNativeAuthCallback } from '../utils/nativeAuth';

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
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        const query = parseNativeAuthCallback(url);
        if (!query) return;
        await Browser.close();
        const { error } = await supabase.auth.exchangeCodeForSession(`?${query}`);
        if (error) {
          set({ authError: error.message });
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
    await supabase.auth.signOut();
    set({ session: null });
  },

  clearAuthError: () => set({ authError: null }),
}));
