import { api } from '@/lib/axios'
import type { Document, DocumentStatus } from '@/types'

export type CreateDocumentDto = {
  title: string
  clientName: string
  clientEmail: string
  clientDocument?: string | null
  content: Record<string, unknown>
  totalValue: number
  currency?: string
  validUntil?: string | null
  templateId?: string | null
}

export type UpdateDocumentDto = Partial<CreateDocumentDto>

export async function listDocuments(status?: DocumentStatus): Promise<Document[]> {
  const response = await api.get<Document[]>('/documents', {
    params: status ? { status } : undefined,
  })
  return response.data
}

export async function getDocument(id: string): Promise<Document> {
  const response = await api.get<Document>(`/documents/${id}`)
  return response.data
}

export async function createDocument(data: CreateDocumentDto): Promise<Document> {
  const response = await api.post<Document>('/documents', data)
  return response.data
}

export async function updateDocument(
  id: string,
  data: UpdateDocumentDto,
): Promise<Document> {
  const response = await api.patch<Document>(`/documents/${id}`, data)
  return response.data
}

export async function changeDocumentStatus(
  id: string,
  status: DocumentStatus,
): Promise<Document> {
  const response = await api.patch<Document>(`/documents/${id}/status`, { status })
  return response.data
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`)
}

export async function sendDocument(
  id: string,
  recipientEmail?: string,
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/documents/${id}/send`, {
    ...(recipientEmail ? { recipientEmail } : {}),
  })
  return response.data
}

export async function downloadDocumentPdf(
  id: string,
  filename: string,
): Promise<void> {
  const response = await api.get(`/documents/${id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
