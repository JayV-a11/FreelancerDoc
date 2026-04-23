'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'
import { getMe } from '@/services/users.service'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setInitialized, isInitialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    getMe()
      .then((user) => {
        if (!cancelled) {
          setUser(user)
          setInitialized()
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.replace('/login')
        }
      })

    return () => {
      cancelled = true
    }
  }, [setUser, setInitialized, router])

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
