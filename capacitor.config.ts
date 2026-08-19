// Native builds (this file) must be produced with VITE_BASE_PATH=/ set —
// see .github/workflows/deploy-ec2.yml for the equivalent pattern used by
// the root-path web deploy target. `npm run build` alone defaults to the
// /trip_tracker_2026/ GitHub Pages path and must not be used to feed `cap sync`.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.triptracker.app',
  appName: 'Trip Tracker 2026',
  webDir: 'dist',
  plugins: {
    // 'none' hands full control to the manual keyboardWillShow/Hide
    // handling in main.tsx — letting the native side also resize would
    // double-compensate against our own padding adjustment.
    Keyboard: {
      resize: 'none',
    },
    // We drive update checks ourselves against a self-hosted manifest
    // (src/utils/liveUpdate.ts) rather than Capgo's hosted backend, so the
    // plugin's own auto-polling is disabled.
    CapacitorUpdater: {
      autoUpdate: false,
    },
    // Without this, iOS delivers a push with zero visible presentation
    // (no banner/sound/badge) whenever it arrives while the app is in the
    // foreground — the notification still reaches the JS
    // pushNotificationReceived listener, it just never becomes visible to
    // the user, which reads exactly like "server says sent, nothing
    // shown." Background/killed-app delivery is handled by iOS directly
    // and is unaffected by this setting.
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
