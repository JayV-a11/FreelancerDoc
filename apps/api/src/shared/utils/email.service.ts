import nodemailer from 'nodemailer'
import { env } from '@/shared/config/env'

export type SendDocumentEmailOptions = {
  to: string
  documentTitle: string
  senderName: string
  pdfBuffer: Buffer
  locale?: string
  message?: string
}

type EmailTemplate = {
  subject: string
  html: string
  text: string
}

function buildTemplate(
  locale: string,
  senderName: string,
  documentTitle: string,
  message?: string,
): EmailTemplate {
  const customBlock = message
    ? { html: `<p>${message}</p>`, text: `${message}\n\n` }
    : { html: '', text: '' }

  const lang = locale.toLowerCase()

  if (lang === 'pt-br' || lang === 'pt') {
    return {
      subject: `Documento: ${documentTitle} de ${senderName}`,
      html: `<p>Olá,</p>
<p><strong>${senderName}</strong> enviou um documento para você: <em>${documentTitle}</em>.</p>
${customBlock.html}
<p>O documento está em anexo no formato PDF.</p>`,
      text: `Olá,\n\n${senderName} enviou um documento para você: ${documentTitle}.\n\n${customBlock.text}O documento está em anexo no formato PDF.`,
    }
  }

  if (lang === 'es') {
    return {
      subject: `Documento: ${documentTitle} de ${senderName}`,
      html: `<p>Hola,</p>
<p><strong>${senderName}</strong> te ha enviado un documento: <em>${documentTitle}</em>.</p>
${customBlock.html}
<p>El documento está adjunto en formato PDF.</p>`,
      text: `Hola,\n\n${senderName} te ha enviado un documento: ${documentTitle}.\n\n${customBlock.text}El documento está adjunto en formato PDF.`,
    }
  }

  // Default: English
  return {
    subject: `Document: ${documentTitle} from ${senderName}`,
    html: `<p>Hello,</p>
<p><strong>${senderName}</strong> has sent you a document: <em>${documentTitle}</em>.</p>
${customBlock.html}
<p>Please find it attached as a PDF.</p>`,
    text: `Hello,\n\n${senderName} has sent you a document: ${documentTitle}.\n\n${customBlock.text}Please find it attached as a PDF.`,
  }
}

/** Send a document PDF to a client by email. */
export async function sendDocumentByEmail(
  options: SendDocumentEmailOptions,
): Promise<void> {
  const { to, documentTitle, senderName, pdfBuffer, locale = 'en', message } = options
  const safeName = documentTitle.replace(/[^a-zA-Z0-9]/g, '_')
  const filename = `${safeName}.pdf`

  const template = buildTemplate(locale, senderName, documentTitle, message)

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
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}
