'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Root-level error boundary.
 * Rendered when an unhandled error bubbles up from the root layout or page.
 * Must be a Client Component per Next.js App Router requirements.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <html lang="pt-br">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive" aria-hidden />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Algo deu errado</h1>
            <p className="max-w-sm text-muted-foreground">
              Um erro inesperado ocorreu. Tente novamente ou volte para a página inicial.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground">ID do erro: {error.digest}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button onClick={reset} variant="default">
              Tentar novamente
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Ir para o início</Link>
            </Button>
          </div>
        </main>
      </body>
    </html>
  )
}
