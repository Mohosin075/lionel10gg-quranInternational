import nodemailer from 'nodemailer'
import { StatusCodes } from 'http-status-codes'
import config from '../../../config'
import ApiError from '../../../errors/ApiError'
import { EmailNotificationData } from './notification.interface'
import { EmailTemplates } from './notification.templates'
import SMTPTransport from 'nodemailer/lib/smtp-transport'

export class EmailProvider {
  private transporter: nodemailer.Transporter
  private static instance: EmailProvider

  private constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false, // false for TLS, true for SSL
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
      // For development, bypass SSL verification
      tls: {
        rejectUnauthorized: false,
      },
      // Connection settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    } as SMTPTransport.Options)

    // Initialize asynchronously
    // this.initialize()
  }

  static getInstance(): EmailProvider {
    if (!EmailProvider.instance) {
      EmailProvider.instance = new EmailProvider()
    }
    return EmailProvider.instance
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify()
      console.log('✅ Email server connection verified')
    } catch (error: unknown) {
      console.error(
        '❌ Email server connection failed:',
        (error as Error).message,
      )
      throw new ApiError(
        StatusCodes.SERVICE_UNAVAILABLE,
        'Email service is currently unavailable',
      )
    }
  }

  async sendEmail(data: EmailNotificationData): Promise<boolean> {
    try {
      const { subject, html } = EmailTemplates.getTemplate(
        data.template,
        data.data,
      )

      const mailOptions: nodemailer.SendMailOptions = {
        from: `${config.appName || 'App'} <${config.email.from}>`,
        to: Array.isArray(data.to) ? data.to.join(',') : data.to,
        subject,
        html,
        attachments: data.attachments,
      }

      const info = await this.transporter.sendMail(mailOptions)

      console.log(`📧 Email sent: ${info.messageId}`)
      console.log(`   To: ${mailOptions.to}`)
      console.log(`   Subject: ${subject}`)

      return true
    } catch (error: unknown) {
      console.error('❌ Email sending failed:', (error as Error).message)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        `Failed to send email: ${(error as Error).message}`,
      )
    }
  }

  async sendBulkEmails(
    emails: EmailNotificationData[],
  ): Promise<{ success: number; failed: number }> {
    const results = {
      success: 0,
      failed: 0,
    }

    for (const emailData of emails) {
      try {
        await this.sendEmail(emailData)
        results.success++
      } catch {
        console.error(`Failed to send email to: ${emailData.to}`)
        results.failed++
      }
    }

    console.log(
      `📧 Bulk email sending completed: ${results.success} succeeded, ${results.failed} failed`,
    )
    return results
  }

  async sendTemplateEmail(
    to: string | string[],
    template: string,
    templateData: Record<string, unknown>,
    subjectOverride?: string,
  ): Promise<boolean> {
    const data: EmailNotificationData = {
      to,
      subject: subjectOverride || '',
      template,
      data: templateData,
    }

    return this.sendEmail(data)
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    return this.sendTemplateEmail(to, 'welcome', {
      userName,
      actionUrl: `${config.clientUrl}/dashboard`,
      actionText: 'Go to Dashboard',
    })
  }

  async sendPasswordReset(
    to: string,
    resetCode: string,
    userName: string,
  ): Promise<boolean> {
    return this.sendTemplateEmail(to, 'password-reset', {
      userName,
      resetCode,
      expiryMinutes: 30,
      actionUrl: `${config.clientUrl}/reset-password?code=${resetCode}`,
      actionText: 'Reset Password',
    })
  }

  async sendAccountVerification(
    to: string,
    userName: string,
    verificationToken: string,
  ): Promise<boolean> {
    const verificationUrl = `${config.clientUrl}/verify-email?token=${verificationToken}`

    return this.sendTemplateEmail(to, 'account-verification', {
      userName,
      verificationUrl,
      actionUrl: verificationUrl,
      actionText: 'Verify Account',
    })
  }
}

export const emailProvider = EmailProvider.getInstance()
