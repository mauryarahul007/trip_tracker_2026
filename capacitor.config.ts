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
  },
};

export default config;
