'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { listDocuments, deleteDocument } from '@/services/documents.service'
import type { Document, DocumentStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

const STATUS_VARIANT: Record<
  DocumentStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  DRAFT: 'secondary',
  SENT: 'default',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  EXPIRED: 'outline',
}

const ALL_STATUSES: DocumentStatus[] = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
]

export default function DocumentsPage() {
  const router = useRouter()
  const t = useTranslations('documents')
  const tCommon = useTranslations('common')
  const [documents, setDocuments] = useState<Document[]>([])
  const [filter, setFilter] = useState<DocumentStatus | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = (status?: DocumentStatus) => {
    setLoading(true)
    setError(null)
    listDocuments(status)
      .then(setDocuments)
      .catch(() => setError(t('failedLoad')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(filter === 'ALL' ? undefined : filter)
  }, [filter])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteDocument(deleteId)
      setDocuments((prev) => prev.filter((d) => d.id !== deleteId))
    } catch {
      setError(t('failedDelete'))
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('newDocument')}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{t('filterByStatus')}</span>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as DocumentStatus | 'ALL')}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all')}</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`statuses.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t('noDocuments')}</p>
            <Button asChild variant="outline">
              <Link href="/documents/new">{t('createFirst')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => router.push(`/documents/${doc.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{doc.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {doc.clientName} · {doc.clientEmail} ·{' '}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div
                    className="flex shrink-0 items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge variant={STATUS_VARIANT[doc.status]}>
                      {t(`statuses.${doc.status}`)}
                    </Badge>
                    {doc.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">{tCommon('delete')}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>{t('deleteDialog.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('deleteDialog.confirming') : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}