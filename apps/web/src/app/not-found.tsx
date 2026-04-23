'use client'

import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const t = useTranslations('notFound')
  const tCommon = useTranslations('common')
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground" aria-hidden />
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-xl font-semibold">{t('title')}</p>
        <p className="max-w-sm text-muted-foreground">{t('description')}</p>
      </div>
      <Button asChild>
        <Link href="/">{tCommon('goHome')}</Link>
      </Button>
    </main>
  )
}
