import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site under /trip_tracker_2026/.
  // Only applies to production builds so `npm run dev` still serves from /.
  base: command === 'build' ? '/trip_tracker_2026/' : '/',
  plugins: [react()],
}))
