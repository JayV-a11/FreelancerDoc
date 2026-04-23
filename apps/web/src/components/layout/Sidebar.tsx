'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, LayoutTemplate, User, LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { logout } from '@/services/auth.service'
import { LocaleSwitcher } from './LocaleSwitcher'

export function Sidebar() {
  const pathname = usePathname()
  const { user, clear } = useAuthStore()
  const router = useRouter()
  const t = useTranslations('nav')

  const NAV_ITEMS = [
    { label: t('templates'), href: '/templates', icon: LayoutTemplate },
    { label: t('documents'), href: '/documents', icon: FileText },
    { label: t('profile'), href: '/profile', icon: User },
  ]

  const handleLogout = async () => {
    await logout().catch(() => {})
    clear()
    router.replace('/login')
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-card px-3 py-5">
      <div className="mb-6 px-2">
        <span className="text-lg font-bold tracking-tight">FreelanceDoc</span>
        {user?.name && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.name}</p>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="space-y-1">
        <LocaleSwitcher />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t('signOut')}
        </button>
      </div>
    </aside>
  )
}

