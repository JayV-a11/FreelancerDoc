import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks — available inside vi.mock factory ──────────────────────
const { mockSendMail, mockCreateTransport } = vi.hoisted(() => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
  const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail })
  return { mockSendMail, mockCreateTransport }
})

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}))

// ── Imports — after mocks ──────────────────────────────────────────────────
import {
  sendDocumentByEmail,
  type SendDocumentEmailOptions,
} from './email.service'

// ── Fixtures ───────────────────────────────────────────────────────────────
const FAKE_PDF = Buffer.from('%PDF-1.4 fake')

const BASE_OPTIONS: SendDocumentEmailOptions = {
  to: 'client@example.com',
  documentTitle: 'Website Proposal',
  senderName: 'Alice Freelancer',
  pdfBuffer: FAKE_PDF,
}

// ── sendDocumentByEmail ────────────────────────────────────────────────────
describe('sendDocumentByEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' })
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail })
  })

  it('calls sendMail once with the correct recipient', async () => {
    await sendDocumentByEmail(BASE_OPTIONS)

    expect(mockSendMail).toHaveBeenCalledOnce()
    const call = mockSendMail.mock.calls[0][0] as Record<string, unknown>
    expect(call.to).toBe('client@example.com')
  })

  it('sets the from address from SMTP_FROM env var', async () => {
    await sendDocumentByEmail(BASE_OPTIONS)

    const call = mockSendMail.mock.calls[0][0] as Record<string, unknown>
    expect(call.from).toContain('noreply@test.com')
  })

  it('includes the document title in the subject', async () => {
    await sendDocumentByEmail(BASE_OPTIONS)

    const call = mockSendMail.mock.calls[0][0] as Record<string, unknown>
    expect(call.subject).toContain('Website Proposal')
  })

  it('includes the sender name in the subject', async () => {
    await sendDocumentByEmail(BASE_OPTIONS)

    const call = mockSendMail.mock.calls[0][0] as Record<string, unknown>
    expect(call.subject).toContain('Alice Freelancer')
  })

  it('attaches the PDF buffer with application/pdf content type', async () => {
    await sendDocumentByEmail(BASE_OPTIONS)

    const call = mockSendMail.mock.calls[0][0] as Record<string, unknown>
    const attachments = call.attachments as { content: Buffer; contentType: string }[]
    expect(Array.isArray(attachments)).toBe(true)
    expect(attachments).toHaveLength(1)
    expect(attachments[0].contentType).toBe('application/pdf')
    expect(attachments[0].content).toBe(FAKE_PDF)
  })

  it('names the PDF attachment after the document title', async () => {
    await sendDocumentByEmail(BASE_OPTIONS)

    const call = mockSendMail.mock.calls[0][0] as Record<string, unknown>
    const attachments = call.attachments as { filename: string }[]
    expect(attachments[0].filename).toContain('Website_Proposal')
    expect(attachments[0].filename).toMatch(/\.pdf$/)
  })

  it('resolves without throwing on success', async () => {
    await expect(sendDocumentByEmail(BASE_OPTIONS)).resolves.toBeUndefined()
  })

  it('propagates errors thrown by sendMail', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'))

    await expect(sendDocumentByEmail(BASE_OPTIONS)).rejects.toThrow(
      'SMTP connection refused',
    )
  })
})

