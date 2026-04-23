import { api } from '@/lib/axios'
import type { Template, TemplateType } from '@/types'

export type CreateTemplateDto = {
  name: string
  type: TemplateType
  content: Record<string, unknown>
}

export type UpdateTemplateDto = Partial<CreateTemplateDto>

export async function listTemplates(): Promise<Template[]> {
  const response = await api.get<Template[]>('/templates')
  return response.data
}

export async function getTemplate(id: string): Promise<Template> {
  const response = await api.get<Template>(`/templates/${id}`)
  return response.data
}

export async function createTemplate(data: CreateTemplateDto): Promise<Template> {
  const response = await api.post<Template>('/templates', data)
  return response.data
}

export async function updateTemplate(
  id: string,
  data: UpdateTemplateDto,
): Promise<Template> {
  const response = await api.patch<Template>(`/templates/${id}`, data)
  return response.data
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`)
}
