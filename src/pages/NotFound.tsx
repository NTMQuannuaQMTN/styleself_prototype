import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <Link to="/" className="font-display text-xl tracking-tight text-ink">
        Style<span className="italic">Self</span>
      </Link>
      <p className="eyebrow mt-10">404</p>
      <h1 className="mt-3 text-3xl text-ink sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-sm text-muted">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Link to="/" className="btn btn-secondary mt-8">
        Back to home
      </Link>
    </main>
  )
}
