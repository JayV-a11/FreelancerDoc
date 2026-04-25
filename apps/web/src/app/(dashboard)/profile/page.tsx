'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth.store'
import { updateProfile, changePassword } from '@/services/users.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type ProfileData = {
  name: string
  professionalName?: string
  document?: string
  phone?: string
  address?: string
}

type PasswordData = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')

  const profileSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('personal.nameRequired')),
        professionalName: z.string().optional(),
        document: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      }),
    [t],
  )

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('password.currentRequired')),
          newPassword: z.string().min(8, t('password.newMin')),
          confirmPassword: z.string().min(1, t('password.confirmRequired')),
        })
        .refine((d) => d.newPassword === d.confirmPassword, {
          path: ['confirmPassword'],
          message: t('password.noMatch'),
        }),
    [t],
  )

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileData>({ resolver: zodResolver(profileSchema) })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<PasswordData>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name ?? '',
        professionalName: user.professionalName ?? '',
        document: user.document ?? '',
        phone: user.phone ?? '',
        address: user.address ?? '',
      })
    }
  }, [user, resetProfile])

  const onProfileSubmit = async (data: ProfileData) => {
    try {
      const updated = await updateProfile({
        name: data.name,
        professionalName: data.professionalName || undefined,
        document: data.document || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
      })
      setUser(updated)
      toast.success(t('personal.successMessage'))
    } catch {
      toast.error(t('personal.failedUpdate'))
    }
  }

  const onPasswordSubmit = async (data: PasswordData) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success(t('password.successMessage'))
      resetPassword()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        t('password.failedChange')
      toast.error(message)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      {/* Profile form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('personal.title')}</CardTitle>
          <CardDescription>{t('personal.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleProfileSubmit(onProfileSubmit)}
            className="space-y-4"
            noValidate
          >

            <div className="space-y-1">
              <Label htmlFor="name">{t('personal.fullName')}</Label>
              <Input id="name" {...registerProfile('name')} />
              {profileErrors.name && (
                <p className="text-xs text-destructive">{profileErrors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="professionalName">
                {t('personal.professionalName')}{' '}
                <span className="text-muted-foreground">({tCommon('optional')})</span>
              </Label>
              <Input id="professionalName" {...registerProfile('professionalName')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="document">
                  {t('personal.document')}{' '}
                  <span className="text-muted-foreground">({tCommon('optional')})</span>
                </Label>
                <Input id="document" {...registerProfile('document')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">
                  {t('personal.phone')}{' '}
                  <span className="text-muted-foreground">({tCommon('optional')})</span>
                </Label>
                <Input id="phone" {...registerProfile('phone')} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">
                {t('personal.address')}{' '}
                <span className="text-muted-foreground">({tCommon('optional')})</span>
              </Label>
              <Input id="address" {...registerProfile('address')} />
            </div>

            <Button type="submit" disabled={profileSubmitting}>
              {profileSubmitting ? tCommon('saving') : t('personal.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Password form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('password.title')}</CardTitle>
          <CardDescription>{t('password.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handlePasswordSubmit(onPasswordSubmit)}
            className="space-y-4"
            noValidate
          >

            <div className="space-y-1">
              <Label htmlFor="currentPassword">{t('password.current')}</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                {...registerPassword('currentPassword')}
              />
              {passwordErrors.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordErrors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="newPassword">{t('password.new')}</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...registerPassword('newPassword')}
              />
              {passwordErrors.newPassword && (
                <p className="text-xs text-destructive">
                  {passwordErrors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">{t('password.confirm')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...registerPassword('confirmPassword')}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {passwordErrors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={passwordSubmitting}>
              {passwordSubmitting ? tCommon('saving') : t('password.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
