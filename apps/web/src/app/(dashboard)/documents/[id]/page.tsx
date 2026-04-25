'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Download, Send, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  getDocument,
  changeDocumentStatus,
  sendDocument,
  downloadDocumentPdf,
} from '@/services/documents.service'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

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

const VALID_TRANSITIONS: Partial<Record<DocumentStatus, DocumentStatus[]>> = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = useTranslations('documentDetail')
  const tDoc = useTranslations('documents')
  const tCommon = useTranslations('common')
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sending, setSending] = useState(false)

  const load = () => {
    setLoading(true)
    getDocument(id)
      .then(setDoc)
      .catch(() => setError(t('failedLoad')))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const handleStatusChange = async (status: DocumentStatus) => {
    if (!doc) return
    try {
      const updated = await changeDocumentStatus(doc.id, status)
      setDoc(updated)
      toast.success(t('statusChanged'))
    } catch {
      toast.error(t('failedStatus'))
    }
  }

  const handleSend = async () => {
    if (!doc) return
    setSending(true)
    try {
      const result = await sendDocument(doc.id, recipientEmail || undefined)
      toast.success(result.message)
      setSendDialogOpen(false)
    } catch {
      toast.error(t('failedSend'))
    } finally {
      setSending(false)
    }
  }

  const handleDownload = async () => {
    if (!doc) return
    await downloadDocumentPdf(doc.id, doc.title).catch(() =>
      toast.error(t('failedDownload')),
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error ?? t('failedLoad')}</AlertDescription>
      </Alert>
    )
  }

  const transitions = VALID_TRANSITIONS[doc.status] ?? []
  const blocks =
    (doc.content as { blocks?: Array<{ type: string; value: string }> })?.blocks ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/documents')}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">{tCommon('back')}</span>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{doc.title}</h1>
        </div>
        <Badge variant={STATUS_VARIANT[doc.status]}>
          {tDoc(`statuses.${doc.status}`)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          {t('downloadPdf')}
        </Button>

        <Button variant="outline" size="sm" onClick={() => setSendDialogOpen(true)}>
          <Send className="mr-2 h-4 w-4" />
          {t('sendByEmail')}
        </Button>

        {transitions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {t('changeStatus')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {transitions.map((s) => (
                <DropdownMenuItem key={s} onClick={() => handleStatusChange(s)}>
                  {t('markAs', { status: tDoc(`statuses.${s}`) })}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>{t('clientSection')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">{t('clientName')}</p>
            <p className="text-muted-foreground">{doc.clientName}</p>
          </div>
          <div>
            <p className="font-medium">{t('clientEmail')}</p>
            <p className="text-muted-foreground">{doc.clientEmail}</p>
          </div>
          {doc.clientDocument && (
            <div>
              <p className="font-medium">{t('clientDocument')}</p>
              <p className="text-muted-foreground">{doc.clientDocument}</p>
            </div>
          )}
          <div>
            <p className="font-medium">{t('value')}</p>
            <p className="text-muted-foreground">
              {doc.currency} {doc.totalValue}
            </p>
          </div>
          {doc.validUntil && (
            <div>
              <p className="font-medium">{t('validUntil')}</p>
              <p className="text-muted-foreground">
                {new Date(doc.validUntil).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {blocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('contentSection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {blocks.map((block, i) =>
              block.type === 'heading' ? (
                <h3 key={i} className="text-base font-semibold">
                  {block.value}
                </h3>
              ) : (
                <p key={i} className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {block.value}
                </p>
              ),
            )}
          </CardContent>
        </Card>
      )}

      {doc.versions && doc.versions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('versionsSection')}</CardTitle>
            <CardDescription>
              {t('revisions', { count: doc.versions.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {doc.versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">v{v.version}</span>
                <span className="text-muted-foreground">
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sendDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('sendDialog.description')}{' '}
              <strong>{doc.clientEmail}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <Label htmlFor="recipientEmail">{t('sendDialog.override')}</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder={doc.clientEmail}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? t('sendDialog.sending') : t('sendDialog.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
