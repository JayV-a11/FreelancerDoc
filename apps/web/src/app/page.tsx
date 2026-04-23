import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">FreelanceDoc</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Professional proposal and contract generator for freelancers.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Create account
        </Link>
      </div>
    </main>
  )
}
