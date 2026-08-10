import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

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
  },

  signInWithGoogle: async (redirectPath = '/') => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectPath}`,
      },
    });
    if (error) {
      set({ authError: error.message });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null });
  },

  clearAuthError: () => set({ authError: null }),
}));
