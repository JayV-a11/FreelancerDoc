import { AuthProvider } from '@/components/providers/AuthProvider'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl p-6">{children}</div>
        </main>
      </div>
    </AuthProvider>
  )
}
