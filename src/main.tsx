import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import LandingPage from './pages/LandingPage.tsx'
import ComingSoon from './pages/ComingSoon.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Auth flows are handled in a later phase. Routes are wired now so
            landing-page CTAs point at their final destinations. */}
        <Route path="/login" element={<ComingSoon title="Log in" />} />
        <Route
          path="/create-account"
          element={<ComingSoon title="Create your account" />}
        />
        <Route path="*" element={<ComingSoon title="Page not found" />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
