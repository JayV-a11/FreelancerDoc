import { api } from '@/lib/axios'
import type { User } from '@/types'

type UpdateProfileDto = {
  name?: string
  professionalName?: string
  document?: string
  phone?: string
  address?: string
}

type ChangePasswordDto = {
  currentPassword: string
  newPassword: string
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>('/users/me')
  return response.data
}

export async function updateProfile(data: UpdateProfileDto): Promise<User> {
  const response = await api.patch<User>('/users/me', data)
  return response.data
}

export async function changePassword(
  data: ChangePasswordDto,
): Promise<{ message: string }> {
  const response = await api.patch<{ message: string }>('/users/me/password', data)
  return response.data
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/users/me')
}
