import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkgVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

// Apple-style Version/Build split: pkgVersion is the stable marketing
// version (bumped manually via `npm run release:*`), buildNumber is the
// commit count -- auto-incrementing, unique per commit, zero maintenance.
let buildNumber = 'dev'
try {
  buildNumber = execSync('git rev-list --count HEAD').toString().trim()
} catch {
  // no git available — keep the 'dev' fallback
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE_PATH || '/trip_tracker_2026/') : '/',
  plugins: [react()],
  // maplibre-gl spins up its tile-parsing worker via a relative import that
  // Vite's dep pre-bundler doesn't rewrite correctly, producing a 404 for
  // maplibre-gl-worker.mjs from node_modules/.vite/deps at dev time —
  // excluding it from pre-bundling serves it as native ESM instead, which
  // resolves the worker correctly. Production builds are unaffected (no
  // optimizeDeps step there).
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
    __BUILD_NUMBER__: JSON.stringify(buildNumber),
  },
}))
