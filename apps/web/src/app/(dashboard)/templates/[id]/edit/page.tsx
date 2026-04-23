'use client'

import { useMemo, useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getTemplate, updateTemplate } from '@/services/templates.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'

type FormData = { name: string; type: 'PROPOSAL' | 'CONTRACT'; content: string }

export default function EditTemplatePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const t = useTranslations('templatesEdit')
  const tCommon = useTranslations('common')

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('validation.nameRequired')),
        type: z.enum(['PROPOSAL', 'CONTRACT'] as const),
        content: z
          .string()
          .min(1, t('validation.contentRequired'))
          .refine(
            (v) => {
              try {
                JSON.parse(v)
                return true
              } catch {
                return false
              }
            },
            { message: t('validation.contentInvalidJson') },
          ),
      }),
    [t],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    getTemplate(id)
      .then((template) => {
        reset({
          name: template.name,
          type: template.type,
          content: JSON.stringify(template.content, null, 2),
        })
      })
      .catch(() => setLoadError(t('notFound')))
      .finally(() => setLoading(false))
  }, [id, reset, t])

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await updateTemplate(id, {
        name: data.name,
        type: data.type,
        content: JSON.parse(data.content) as Record<string, unknown>,
      })
      router.push('/templates')
    } catch {
      setServerError(t('failedUpdate'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{t('cardTitle')}</CardTitle>
          <CardDescription>
            {t('cardDescription')}{' '}
            <code className="text-xs">
              {'{blocks: [{type:"heading"|"text", value:"…"}]}'}
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>{t('type')}</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectType')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROPOSAL">{t('proposal')}</SelectItem>
                      <SelectItem value="CONTRACT">{t('contract')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-xs text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="content">{t('content')}</Label>
              <Textarea
                id="content"
                rows={12}
                className="font-mono text-xs"
                {...register('content')}
              />
              {errors.content && (
                <p className="text-xs text-destructive">{errors.content.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('saving') : t('saveChanges')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/templates')}
              >
                {tCommon('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

