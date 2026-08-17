import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import './index.css'
import App from './App.tsx'
import { LoginScreen } from './components/LoginScreen'
import { JoinTripScreen } from './components/JoinTripScreen'
import { RequireAuth } from './components/RequireAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UpdateBanner } from './components/UpdateBanner'
import { registerServiceWorkerUpdateWatcher } from './services/serviceWorker'

registerServiceWorkerUpdateWatcher()

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
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/join/:code"
          element={
            <RequireAuth>
              <ErrorBoundary>
                <JoinTripScreen />
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
