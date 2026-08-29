import { AppHeader } from '../../components/app/AppHeader'
import { useAuth } from '../../auth/useAuth'

export default function ShopHome() {
  const { profile, user } = useAuth()
  const name = profile?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />
      <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="eyebrow">Shopper</p>
        <h1 className="mt-4 text-3xl text-ink sm:text-4xl">Welcome, {name}</h1>
        <p className="mt-4 text-muted">
          Your AI-powered shopping experience will appear here in the next build
          phase.
        </p>
      </main>
    </div>
  )
}
