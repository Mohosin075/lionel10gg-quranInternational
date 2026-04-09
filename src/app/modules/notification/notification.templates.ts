import { NOTIFICATION_TEMPLATES } from './notification.constant'

export interface TemplateData {
  [key: string]: unknown
}

export class EmailTemplates {
  private static baseStyles = `
    <style>
      * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; }
      body { margin: 0; padding: 0; background-color: #f7f7f7; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
      .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
      .footer { padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #eeeeee; }
      .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
    </style>
  `

  private static header = (title: string) => `
    <div class="header">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">${title}</h1>
    </div>
  `

  private static footer = `
    <div class="footer">
      <p>© ${new Date().getFullYear()} Quran International. All rights reserved.</p>
      <p>This email was sent to you by Quran International. If you have any questions, contact us at support@quraninternational.com</p>
      <p>
        <a href="{{unsubscribeLink}}" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
        <a href="{{privacyLink}}" style="color: #667eea; text-decoration: none;">Privacy Policy</a> | 
        <a href="{{termsLink}}" style="color: #667eea; text-decoration: none;">Terms of Service</a>
      </p>
    </div>
  `

  static getTemplate(
    templateName: string,
    data: TemplateData,
  ): { subject: string; html: string } {
    const template = this.templates[templateName]
    if (!template) {
      throw new Error(`Template ${templateName} not found`)
    }

    let html = this.baseStyles
    html += `<div class="container">`
    html += this.header(template.getTitle(data))
    html += `<div class="content">`
    html += template.getBody(data)
    if (data.actionUrl && data.actionText) {
      html += `<div style="text-align: center; margin-top: 30px;">
                <a href="${data.actionUrl}" class="button">${data.actionText}</a>
              </div>`
    }
    html += `</div>`
    html += this.footer
    html += `</div>`

    return {
      subject: template.getSubject(data),
      html: this.replacePlaceholders(html, data),
    }
  }

  private static replacePlaceholders(html: string, data: TemplateData): string {
    return html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match
    })
  }

  private static templates: Record<
    string,
    {
      getTitle: (data: TemplateData) => string
      getSubject: (data: TemplateData) => string
      getBody: (data: TemplateData) => string
    }
  > = {
    // Welcome Email
    [NOTIFICATION_TEMPLATES.WELCOME]: {
      getTitle: (data: TemplateData) =>
        `Welcome to Quran International, ${data.userName}!`,
      getSubject: () => `Welcome to Quran International!`,
      getBody: (data: TemplateData) => `
        <h2>Welcome aboard, ${data.userName}!</h2>
        <p>We're excited to have you join our community. Here's what you can do:</p>
        <ul>
          <li>Connect with like-minded people</li>
          <li>Stay updated with the latest news</li>
          <li>Access exclusive content and features</li>
        </ul>
        <p>Start exploring now and discover everything we have to offer!</p>
      `,
    },

    // Password Reset
    [NOTIFICATION_TEMPLATES.PASSWORD_RESET]: {
      getTitle: () => `Reset Your Password`,
      getSubject: () => `Password Reset Request`,
      getBody: (data: TemplateData) => `
        <h2>Reset Your Password</h2>
        <p>We received a request to reset your password for your account.</p>
        
        <div style="background: #f0f7ff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0;"><strong>Reset Code:</strong></p>
          <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 10px 0;">${data.resetCode}</h1>
          <p style="color: #666; font-size: 14px;">This code will expire in ${data.expiryMinutes} minutes</p>
        </div>

        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Go to the password reset page</li>
          <li>Enter the reset code above</li>
          <li>Create your new password</li>
        </ol>

        <p><strong>Security Tips:</strong></p>
        <ul>
          <li>Never share your password or reset code with anyone</li>
          <li>Create a strong password with letters, numbers, and symbols</li>
          <li>Use different passwords for different accounts</li>
        </ul>

        <p>If you didn't request this password reset, please ignore this email or contact support if you're concerned.</p>
      `,
    },

    // Account Verification
    [NOTIFICATION_TEMPLATES.ACCOUNT_VERIFICATION]: {
      getTitle: () => `Verify Your Account`,
      getSubject: () => `Verify Your Account`,
      getBody: (data: TemplateData) => `
        <h2>Verify Your Email Address</h2>
        <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <p>Click the button below to verify your email:</p>
          <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
        </div>

        <p style="font-size: 14px; color: #666; text-align: center;">
          Or copy and paste this link in your browser:<br/>
          <span style="color: #667eea; word-break: break-all;">${data.verificationUrl}</span>
        </p>

        <p><strong>Why verify?</strong></p>
        <ul>
          <li>Secure your account</li>
          <li>Receive important updates</li>
          <li>Access all features of our platform</li>
        </ul>

        <p>This verification link will expire in 24 hours.</p>
      `,
    },
  }
}
