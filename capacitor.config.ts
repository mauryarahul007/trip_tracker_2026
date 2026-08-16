// Native builds (this file) must be produced with VITE_BASE_PATH=/ set —
// see .github/workflows/deploy-ec2.yml for the equivalent pattern used by
// the root-path web deploy target. `npm run build` alone defaults to the
// /trip_tracker_2026/ GitHub Pages path and must not be used to feed `cap sync`.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.triptracker.app',
  appName: 'Trip Tracker 2026',
  webDir: 'dist',
};

export default config;
