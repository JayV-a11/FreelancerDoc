import nodemailer from 'nodemailer'
import { env } from '@/shared/config/env'

export type SendDocumentEmailOptions = {
  to: string
  documentTitle: string
  senderName: string
  pdfBuffer: Buffer
}

/** Send a document PDF to a client by email. */
export async function sendDocumentByEmail(
  options: SendDocumentEmailOptions,
): Promise<void> {
  const { to, documentTitle, senderName, pdfBuffer } = options
  const safeName = documentTitle.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `${safeName}.pdf`

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: `${senderName} <${env.SMTP_FROM}>`,
    to,
    subject: `Document: ${documentTitle} from ${senderName}`,
    html: `<p>Hello,</p>
<p><strong>${senderName}</strong> has sent you a document: <em>${documentTitle}</em>.</p>
<p>Please find it attached as a PDF.</p>`,
    text: `Hello,\n\n${senderName} has sent you a document: ${documentTitle}.\n\nPlease find it attached as a PDF.`,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}
