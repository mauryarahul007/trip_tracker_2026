import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { LoginScreen } from './components/LoginScreen'
import { JoinTripScreen } from './components/JoinTripScreen'
import { RequireAuth } from './components/RequireAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { UpdateBanner } from './components/UpdateBanner'
import { registerServiceWorkerUpdateWatcher } from './services/serviceWorker'

registerServiceWorkerUpdateWatcher()

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
