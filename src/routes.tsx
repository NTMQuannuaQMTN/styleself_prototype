import { Suspense, lazy } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { FullPageSpinner, RedirectIfAuthed, RequireAuth } from './auth/guards'
import LandingPage from './pages/LandingPage'

// Everything past the landing page is code-split so first paint stays light.
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'))
const AgentPage = lazy(() => import('./pages/agent/AgentPage'))
const StoreProvider = lazy(() =>
  import('./merchant/StoreProvider').then((m) => ({ default: m.StoreProvider })),
)
const MerchantLayout = lazy(() =>
  import('./components/merchant/MerchantLayout').then((m) => ({
    default: m.MerchantLayout,
  })),
)
const CompleteProfilePage = lazy(
  () => import('./pages/merchant/CompleteProfilePage'),
)
const AccountSettingsPage = lazy(
  () => import('./pages/merchant/AccountSettingsPage'),
)
const StoreSettingsPage = lazy(
  () => import('./pages/merchant/StoreSettingsPage'),
)
const OnboardingPage = lazy(() => import('./pages/merchant/OnboardingPage'))
const DashboardPage = lazy(() => import('./pages/merchant/DashboardPage'))
const AgentStudioPage = lazy(() => import('./pages/merchant/AgentStudioPage'))
const CatalogPage = lazy(() => import('./pages/merchant/CatalogPage'))
const ProductEditorPage = lazy(
  () => import('./pages/merchant/ProductEditorPage'),
)
const CatalogImportPage = lazy(
  () => import('./pages/merchant/CatalogImportPage'),
)
const LocationsPage = lazy(() => import('./pages/merchant/LocationsPage'))
const TeamPage = lazy(() => import('./pages/merchant/TeamPage'))
const DeployPage = lazy(() => import('./pages/merchant/DeployPage'))
const PreviewPage = lazy(() => import('./pages/merchant/PreviewPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        {/* Merchant auth (every StyleSelf user is a merchant) */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectIfAuthed>
              <SignUpPage />
            </RedirectIfAuthed>
          }
        />
        {/* legacy path */}
        <Route
          path="/create-account"
          element={<Navigate to="/signup" replace />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Merchant workspace */}
        <Route
          path="/merchant"
          element={
            <RequireAuth>
              <Outlet />
            </RequireAuth>
          }
        >
          {/* Account-level — no store required */}
          <Route path="complete-profile" element={<CompleteProfilePage />} />
          <Route path="account" element={<AccountSettingsPage />} />

          {/* Store-scoped */}
          <Route element={<StoreProvider />}>
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route element={<MerchantLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="agent" element={<AgentStudioPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="catalog/import" element={<CatalogImportPage />} />
              <Route path="catalog/new" element={<ProductEditorPage />} />
              <Route path="catalog/:productId" element={<ProductEditorPage />} />
              <Route path="locations" element={<LocationsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="deploy" element={<DeployPage />} />
              <Route path="preview" element={<PreviewPage />} />
              <Route path="settings" element={<StoreSettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Public deployed agent (embeddable, no auth) */}
        <Route path="/agent" element={<Navigate to="/agent/demo" replace />} />
        <Route path="/agent/:agentId" element={<AgentPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
