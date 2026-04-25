'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { createDocument } from '@/services/documents.service'
import { listTemplates } from '@/services/templates.service'
import type { ContentBlock, Template } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type FormData = {
  title: string
  clientName: string
  clientEmail: string
  clientDocument?: string
  totalValue: number
  currency: string
  validUntil?: string
}

export default function NewDocumentPage() {
  const router = useRouter()
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { type: 'heading', value: '' },
    { type: 'text', value: '' },
  ])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const t = useTranslations('documentsNew')
  const tCommon = useTranslations('common')

  useEffect(() => {
    listTemplates().then(setTemplates).catch(() => {})
  }, [])

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) return
    const template = templates.find((tmpl) => tmpl.id === templateId)
    if (!template) return
    const content = template.content as { blocks?: ContentBlock[] }
    if (content.blocks && content.blocks.length > 0) {
      setBlocks(content.blocks.map((b) => ({ type: b.type, value: b.value })))
    }
  }

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t('validation.titleRequired')),
        clientName: z.string().min(1, t('validation.clientNameRequired')),
        clientEmail: z.string().email(t('validation.clientEmailInvalid')),
        clientDocument: z.string().optional(),
        totalValue: z.coerce.number().positive(t('validation.totalValuePositive')),
        currency: z.string().length(3, t('validation.currencyLength')).default('BRL'),
        validUntil: z.string().optional(),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'BRL' },
  })

  const addBlock = (type: ContentBlock['type']) => {
    setBlocks((prev) => [...prev, { type, value: '' }])
  }

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  const updateBlock = (index: number, value: string) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, value } : b)))
  }

  const onSubmit = async (data: FormData) => {
    try {
      await createDocument({
        ...data,
        templateId: selectedTemplateId || null,
        clientDocument: data.clientDocument || null,
        validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null,
        content: { blocks },
      })
      toast.success(t('createSuccess'))
      router.push('/documents')
    } catch {
      toast.error(t('failedCreate'))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t('clientSection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="template">{t('template')}</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder={t('templatePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t('templateHint')}</p>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="title">{t('documentTitle')}</Label>
              <Input id="title" {...register('title')} placeholder={t('titlePlaceholder')} />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="clientName">{t('clientName')}</Label>
                <Input id="clientName" {...register('clientName')} />
                {errors.clientName && (
                  <p className="text-xs text-destructive">{errors.clientName.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientEmail">{t('clientEmail')}</Label>
                <Input id="clientEmail" type="email" {...register('clientEmail')} />
                {errors.clientEmail && (
                  <p className="text-xs text-destructive">{errors.clientEmail.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="clientDocument">
                {t('clientDocument')}{' '}
                <span className="text-muted-foreground">({tCommon('optional')})</span>
              </Label>
              <Input id="clientDocument" {...register('clientDocument')} placeholder="CPF / CNPJ" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="totalValue">{t('totalValue')}</Label>
                <Input
                  id="totalValue"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('totalValue')}
                />
                {errors.totalValue && (
                  <p className="text-xs text-destructive">{errors.totalValue.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="currency">{t('currency')}</Label>
                <Input id="currency" {...register('currency')} placeholder="BRL" maxLength={3} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="validUntil">
                {t('validUntil')}{' '}
                <span className="text-muted-foreground">({tCommon('optional')})</span>
              </Label>
              <Input id="validUntil" type="date" {...register('validUntil')} />
            </div>
          </CardContent>
        </Card>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>{t('contentSection')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {blocks.map((block, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {block.type}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBlock(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                {block.type === 'heading' ? (
                  <Input
                    value={block.value}
                    onChange={(e) => updateBlock(index, e.target.value)}
                    placeholder={t('headingPlaceholder')}
                    className="font-semibold"
                  />
                ) : (
                  <Textarea
                    value={block.value}
                    onChange={(e) => updateBlock(index, e.target.value)}
                    placeholder={t('paragraphPlaceholder')}
                    rows={3}
                  />
                )}
              </div>
            ))}

            <Separator />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBlock('heading')}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t('heading')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBlock('text')}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t('paragraph')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/documents')}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}


