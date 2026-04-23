'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Dashboard-scoped error boundary.
 * Catches unhandled errors from any route under (dashboard)/ without
 * unmounting the root layout or the Sidebar.
 */
export default function DashboardError({ error, reset }: ErrorPageProps) {
  const t = useTranslations('errors')
  const tCommon = useTranslations('common')

  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('dashboardTitle')}</AlertTitle>
        <AlertDescription>
          {error.message || t('dashboardTitle')}
          {error.digest && (
            <span className="block mt-1 text-xs opacity-70">
              {t('errorId')}: {error.digest}
            </span>
          )}
        </AlertDescription>
      </Alert>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          {tCommon('tryAgain')}
        </Button>
        <Button asChild variant="outline">
          <Link href="/templates">{t('goToTemplates')}</Link>
        </Button>
      </div>
    </div>
  )
}
