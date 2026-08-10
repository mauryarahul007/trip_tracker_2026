import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site under /trip_tracker_2026/, so
  // that's the default for production builds. Deploy targets served from a
  // domain root (e.g. the EC2 pipeline) override this via VITE_BASE_PATH.
  // `npm run dev` always serves from /.
  base: command === 'build' ? (process.env.VITE_BASE_PATH || '/trip_tracker_2026/') : '/',
  plugins: [react()],
}))
