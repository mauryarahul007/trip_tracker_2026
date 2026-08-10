import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { LoginScreen } from './components/LoginScreen'
import { JoinTripScreen } from './components/JoinTripScreen'
import { RequireAuth } from './components/RequireAuth'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/join/:code"
          element={
            <RequireAuth>
              <JoinTripScreen />
            </RequireAuth>
          }
        />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <App />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
