export type DocumentStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
export type TemplateType = 'PROPOSAL' | 'CONTRACT'

export type User = {
  id: string
  email: string
  name: string | null
  professionalName: string | null
  document: string | null
  phone: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

export type Template = {
  id: string
  userId: string
  name: string
  type: TemplateType
  content: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type DocumentVersion = {
  id: string
  documentId: string
  version: number
  content: Record<string, unknown>
  createdAt: string
}

export type Document = {
  id: string
  userId: string
  templateId: string | null
  title: string
  clientName: string
  clientEmail: string
  clientDocument: string | null
  content: Record<string, unknown>
  status: DocumentStatus
  totalValue: string
  currency: string
  validUntil: string | null
  createdAt: string
  updatedAt: string
  versions?: DocumentVersion[]
}

export type ContentBlock = {
  type: 'heading' | 'text'
  value: string
}

export type DocumentContent = {
  blocks: ContentBlock[]
}
