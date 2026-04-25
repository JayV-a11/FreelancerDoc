import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotFoundError } from '@/shared/errors'

// ── Mocks ─────────────────────────────────────────────────────────────────
vi.mock('@/shared/config/prisma', () => ({
  prisma: {
    template: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}))

// ── Imports — after mocks ──────────────────────────────────────────────────
import { prisma } from '@/shared/config/prisma'
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './templates.service'

// ── Fixtures ───────────────────────────────────────────────────────────────
const USER_ID = '550e8400-e29b-41d4-a716-446655440030'
const OTHER_USER_ID = '550e8400-e29b-41d4-a716-446655440031'

const BASE_TEMPLATE = {
  id: '550e8400-e29b-41d4-a716-446655440032',
  userId: USER_ID,
  name: 'My Proposal',
  type: 'PROPOSAL' as const,
  content: { blocks: [{ type: 'text', value: 'Dear {{client_name}},' }] },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

// ── listTemplates ──────────────────────────────────────────────────────────
describe('listTemplates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns all templates owned by the user in descending order', async () => {
    vi.mocked(prisma.template.findMany).mockResolvedValue([BASE_TEMPLATE])

    const result = await listTemplates(USER_ID)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(BASE_TEMPLATE.id)
    expect(prisma.template.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('returns an empty array when user has no templates', async () => {
    vi.mocked(prisma.template.findMany).mockResolvedValue([])

    const result = await listTemplates(USER_ID)

    expect(result).toEqual([])
  })
})

// ── getTemplate ────────────────────────────────────────────────────────────
describe('getTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the template when owned by user', async () => {
    vi.mocked(prisma.template.findFirst).mockResolvedValue(BASE_TEMPLATE)

    const result = await getTemplate(USER_ID, BASE_TEMPLATE.id)

    expect(result.id).toBe(BASE_TEMPLATE.id)
    expect(prisma.template.findFirst).toHaveBeenCalledWith({
      where: { id: BASE_TEMPLATE.id, userId: USER_ID },
    })
  })

  it('throws NotFoundError when template does not exist', async () => {
    vi.mocked(prisma.template.findFirst).mockResolvedValue(null)

    await expect(getTemplate(USER_ID, 'non-existent')).rejects.toThrow(NotFoundError)
  })

  it('error message identifies the Template resource', async () => {
    vi.mocked(prisma.template.findFirst).mockResolvedValue(null)

    await expect(getTemplate(USER_ID, 'non-existent')).rejects.toThrow('Template not found')
  })

  it('throws NotFoundError when template belongs to another user', async () => {
    // findFirst with userId filter returns null for cross-user access
    vi.mocked(prisma.template.findFirst).mockResolvedValue(null)

    await expect(getTemplate(OTHER_USER_ID, BASE_TEMPLATE.id)).rejects.toThrow(
      NotFoundError,
    )
  })
})

// ── createTemplate ─────────────────────────────────────────────────────────
describe('createTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates and returns a template with the user id', async () => {
    vi.mocked(prisma.template.create).mockResolvedValue(BASE_TEMPLATE)

    const result = await createTemplate(USER_ID, {
      name: 'My Proposal',
      type: 'PROPOSAL',
      content: { blocks: [] },
    })

    expect(result.id).toBe(BASE_TEMPLATE.id)
    expect(result.userId).toBe(USER_ID)
  })

  it('passes correct data including userId to prisma', async () => {
    vi.mocked(prisma.template.create).mockResolvedValue(BASE_TEMPLATE)

    await createTemplate(USER_ID, {
      name: 'Contract',
      type: 'CONTRACT',
      content: { body: 'Terms...' },
    })

    expect(prisma.template.create).toHaveBeenCalledWith({
      data: {
        name: 'Contract',
        type: 'CONTRACT',
        content: { body: 'Terms...' },
        userId: USER_ID,
      },
    })
  })
})

// ── updateTemplate ─────────────────────────────────────────────────────────
describe('updateTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates and returns the template', async () => {
    const updated = { ...BASE_TEMPLATE, name: 'Updated Proposal' }
    vi.mocked(prisma.template.findFirst).mockResolvedValue(BASE_TEMPLATE)
    vi.mocked(prisma.template.update).mockResolvedValue(updated)

    const result = await updateTemplate(USER_ID, BASE_TEMPLATE.id, { name: 'Updated Proposal' })

    expect(result.name).toBe('Updated Proposal')
    expect(prisma.template.update).toHaveBeenCalledWith({
      where: { id: BASE_TEMPLATE.id },
      data: { name: 'Updated Proposal' },
    })
  })

  it('includes content in update data when content is provided', async () => {
    const newContent = { blocks: [{ type: 'text', value: 'New content' }] }
    const updated = { ...BASE_TEMPLATE, content: newContent }
    vi.mocked(prisma.template.findFirst).mockResolvedValue(BASE_TEMPLATE)
    vi.mocked(prisma.template.update).mockResolvedValue(updated)

    await updateTemplate(USER_ID, BASE_TEMPLATE.id, { content: newContent })

    const [call] = vi.mocked(prisma.template.update).mock.calls
    expect(call?.[0]?.data).toHaveProperty('content', newContent)
  })

  it('does not include content in update data when content is not provided', async () => {
    const updated = { ...BASE_TEMPLATE, name: 'Only Name Updated' }
    vi.mocked(prisma.template.findFirst).mockResolvedValue(BASE_TEMPLATE)
    vi.mocked(prisma.template.update).mockResolvedValue(updated)

    await updateTemplate(USER_ID, BASE_TEMPLATE.id, { name: 'Only Name Updated' })

    const [call] = vi.mocked(prisma.template.update).mock.calls
    expect(call?.[0]?.data).not.toHaveProperty('content')
  })

  it('throws NotFoundError when template not owned by user', async () => {
    vi.mocked(prisma.template.findFirst).mockResolvedValue(null)

    await expect(
      updateTemplate(OTHER_USER_ID, BASE_TEMPLATE.id, { name: 'Stolen' }),
    ).rejects.toThrow(NotFoundError)

    expect(prisma.template.update).not.toHaveBeenCalled()
  })
})

// ── deleteTemplate ─────────────────────────────────────────────────────────
describe('deleteTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes the template when owned by user', async () => {
    vi.mocked(prisma.template.findFirst).mockResolvedValue(BASE_TEMPLATE)
    vi.mocked(prisma.template.delete).mockResolvedValue(BASE_TEMPLATE)

    await expect(deleteTemplate(USER_ID, BASE_TEMPLATE.id)).resolves.toBeUndefined()

    expect(prisma.template.delete).toHaveBeenCalledWith({
      where: { id: BASE_TEMPLATE.id },
    })
  })

  it('throws NotFoundError when template not owned by user', async () => {
    vi.mocked(prisma.template.findFirst).mockResolvedValue(null)

    await expect(deleteTemplate(OTHER_USER_ID, BASE_TEMPLATE.id)).rejects.toThrow(
      NotFoundError,
    )

    expect(prisma.template.delete).not.toHaveBeenCalled()
  })
})
