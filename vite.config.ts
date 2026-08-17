import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkgVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

// Ties the version shown in Settings to the actual deployed commit, so it
// changes on every real change without anyone having to remember to bump
// package.json. Falls back to 'dev' outside a git checkout (shouldn't
// happen in CI, but keeps local builds from failing).
let buildSha = 'dev'
try {
  buildSha = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // no git available — keep the 'dev' fallback
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site under /trip_tracker_2026/, so
  // that's the default for production builds. Deploy targets served from a
  // domain root (e.g. the EC2 pipeline) override this via VITE_BASE_PATH.
  // `npm run dev` always serves from /.
  base: command === 'build' ? (process.env.VITE_BASE_PATH || '/trip_tracker_2026/') : '/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
    __BUILD_SHA__: JSON.stringify(buildSha),
  },
}))
