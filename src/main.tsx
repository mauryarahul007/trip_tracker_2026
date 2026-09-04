import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import './index.css'
import App from './App.tsx'
import { RequireAuth } from './components/RequireAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UpdateBanner } from './components/UpdateBanner'
import { registerServiceWorkerUpdateWatcher } from './services/serviceWorker'
import { initAutoBugReporter } from './utils/autoBugReporter'
import { useAuthStore } from './store/authStore'
import { isMissingSupabaseEnv } from './services/supabaseClient'
import { initNativeShell } from './utils/nativeShell'
import { initLiveUpdates } from './utils/liveUpdate'

const LoginScreen = lazy(() =>
  import('./components/LoginScreen').then((m) => ({ default: m.LoginScreen }))
)
const ResetPasswordScreen = lazy(() =>
  import('./components/ResetPasswordScreen').then((m) => ({ default: m.ResetPasswordScreen }))
)
const JoinTripScreen = lazy(() =>
  import('./components/JoinTripScreen').then((m) => ({ default: m.JoinTripScreen }))
)
const PrivacyPolicyPage = lazy(() =>
  import('./components/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage }))
)
const TermsOfServicePage = lazy(() =>
  import('./components/TermsOfServicePage').then((m) => ({ default: m.TermsOfServicePage }))
)
const DeleteAccountPage = lazy(() =>
  import('./components/DeleteAccountPage').then((m) => ({ default: m.DeleteAccountPage }))
)

function RouteLoadingFallback() {
  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="ledger-loader" role="status" aria-label="Loading">
        <span className="ledger-loader-mark">TT</span>
      </div>
    </div>
  )
}

// Dev server rebuilds already give instant fresh code -- registering the
// SW here too just adds a stale-while-revalidate cache that serves last
// session's bundle first on every reload, which reads as "my changes
// aren't showing up" during active development.
if (import.meta.env.PROD) {
  registerServiceWorkerUpdateWatcher()
} else if ('serviceWorker' in navigator) {
  // Self-heals browsers that already have a dev-registered SW from before
  // this guard existed -- no manual DevTools "Unregister" step needed,
  // the next reload just goes straight to the network.
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister())
  })
}
// A stale cached index.html can point at chunk hashes a fresh deploy no
// longer serves -- Vite fires this event when a dynamic import 404s for
// that reason. Reload once to pick up the new chunk map instead of
// leaving the user stuck on a dead screen; the sessionStorage guard stops
// a genuinely offline user from being stuck in a reload loop.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('vite-preload-reloaded')) return
  sessionStorage.setItem('vite-preload-reloaded', '1')
  window.location.reload()
})

initAutoBugReporter()
initNativeShell()
void initLiveUpdates()

// Local dev convenience only, and only when there's no real Supabase
// project to test against: sign in as a demo user before RequireAuth ever
// checks for a session, so opening the app locally skips the login screen
// entirely. Once .env points at a real project this must NOT fire — it
// would silently shadow a real superadmin session on every reload.
if (import.meta.env.DEV && isMissingSupabaseEnv && !useAuthStore.getState().session) {
  useAuthStore.getState().signInAsDemoUser()
}

// Android hardware/gesture back button: pop whatever screen/modal pushed a
// history entry (see useHistoryBack), or exit the app at the root screen.
// iOS handles the swipe-back gesture natively via WKWebView history.
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      CapacitorApp.exitApp()
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UpdateBanner />
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <LoginScreen />
            </Suspense>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ResetPasswordScreen />
            </Suspense>
          }
        />
        <Route
          path="/privacy"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <PrivacyPolicyPage />
            </Suspense>
          }
        />
        <Route
          path="/terms"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <TermsOfServicePage />
            </Suspense>
          }
        />
        <Route
          path="/delete-account"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <DeleteAccountPage />
            </Suspense>
          }
        />
        <Route
          path="/join/:code"
          element={
            <RequireAuth>
              <ErrorBoundary>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <JoinTripScreen />
                </Suspense>
              </ErrorBoundary>
            </RequireAuth>
          }
        />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
