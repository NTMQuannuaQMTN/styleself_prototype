import { Link, useSearchParams } from 'react-router-dom'

export default function ComingSoon({ title }: { title: string }) {
  const [params] = useSearchParams()
  const role = params.get('role')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <Link
        to="/"
        className="font-display text-xl tracking-tight text-ink"
      >
        Style<span className="italic">Self</span>
      </Link>
      <h1 className="mt-10 text-3xl text-ink sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-md text-muted">
        {role
          ? `This is where the ${role} sign-up flow will live. It's part of a later build phase.`
          : "This screen is part of a later build phase and isn't wired up yet."}
      </p>
      <Link to="/" className="btn btn-secondary mt-8">
        Back to home
      </Link>
    </main>
  )
}
