import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './auth/AuthProvider.tsx'
import {
  RedirectIfAuthed,
  RequireRole,
  RoleRedirect,
} from './auth/guards.tsx'
import LandingPage from './pages/LandingPage.tsx'
import LoginPage from './pages/auth/LoginPage.tsx'
import SignUpPage from './pages/auth/SignUpPage.tsx'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage.tsx'
import ResetPasswordPage from './pages/auth/ResetPasswordPage.tsx'
import AuthCallbackPage from './pages/auth/AuthCallbackPage.tsx'
import MerchantDashboard from './pages/merchant/MerchantDashboard.tsx'
import ShopHome from './pages/shop/ShopHome.tsx'
import NotFound from './pages/NotFound.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/create-account"
            element={
              <RedirectIfAuthed>
                <SignUpPage />
              </RedirectIfAuthed>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Neutral post-login target — routes to the right home by role. */}
          <Route path="/app" element={<RoleRedirect />} />

          <Route
            path="/merchant"
            element={
              <RequireRole role="merchant">
                <MerchantDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/shop"
            element={
              <RequireRole role="customer">
                <ShopHome />
              </RequireRole>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
