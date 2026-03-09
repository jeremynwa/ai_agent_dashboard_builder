// tools/email.mjs — send_email tool via Nodemailer SMTP
import nodemailer from 'nodemailer';

export const sendEmailTool = {
  name: 'send_email',
  category: 'communication',
  displayName: 'Envoyer un email',
  icon: '\u{1F4E7}',
  description: 'Send an email via SMTP. Supports HTML body and optional attachments (as S3 URLs).',
  input_schema: {
    type: 'object',
    properties: {
      to: { type: 'string', description: 'Recipient email address (comma-separated for multiple)' },
      subject: { type: 'string', description: 'Email subject line' },
      body: { type: 'string', description: 'Email body (HTML or plain text)' },
      cc: { type: 'string', description: 'CC recipients (optional, comma-separated)' },
    },
    required: ['to', 'subject', 'body'],
  },
  requiredSecrets: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'],
  execute: async (input, secrets) => {
    const transporter = nodemailer.createTransport({
      host: secrets.SMTP_HOST,
      port: parseInt(secrets.SMTP_PORT || '587', 10),
      secure: secrets.SMTP_SECURE === 'true',
      auth: {
        user: secrets.SMTP_USER,
        pass: secrets.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: secrets.SMTP_FROM || secrets.SMTP_USER,
      to: input.to,
      cc: input.cc || undefined,
      subject: input.subject,
      html: input.body,
    });

    return {
      success: true,
      messageId: info.messageId,
      to: input.to,
      subject: input.subject,
    };
  },
};
