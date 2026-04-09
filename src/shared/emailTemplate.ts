import { ICreateAccount, IResetPassword } from '../interfaces/emailTemplate'

const createAccount = (values: ICreateAccount) => {
  return {
    to: values.email,
    subject: `Verify your account, ${values.name}`,
    html: `     <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">         <tr>           <td align="center">             <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">               <tr>                 <td style="padding: 30px; text-align:center;">                   <img src="/images/logo.png" alt="Company Logo" style="width:140px; height:auto; display:block; margin:0 auto;">                 </td>               </tr>               <tr>                 <td style="padding: 40px; text-align:center;">                   <h1 style="color:#2c3e50; font-size:26px; margin:0 0 20px;">Verify Your Account</h1>                   <p style="color:#555555; font-size:16px; margin:0 0 30px;">Hi ${values.name}, please use the code below to verify your account.</p>                   <div style="display:inline-block; font-size:32px; font-weight:bold; color:#2980b9; background:#f1f3f6; padding:20px 40px; border-radius:8px; box-shadow: inset 0 3px 6px rgba(0,0,0,0.05); margin-bottom:30px;">${values.otp}</div>                   <p style="color:#777777; font-size:14px; margin:0;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>                 </td>               </tr>               <tr>                 <td style="background:#f9fafc; padding:20px; text-align:center; font-size:12px; color:#999999;">
                                  </td>               </tr>             </table>           </td>         </tr>       </table>     </body>
    `,
  }
}

const resetPassword = (values: IResetPassword) => {
  return {
    to: values.email,
    subject: `Reset your password, ${values.name}`,
    html: `     <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">         <tr>           <td align="center">             <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">               <tr>                 <td style="padding: 30px; text-align:center;">                   <img src="/images/logo.png" alt="Company Logo" style="width:140px; height:auto; display:block; margin:0 auto;">                 </td>               </tr>               <tr>                 <td style="padding: 40px; text-align:center;">                   <h1 style="color:#2c3e50; font-size:26px; margin:0 0 20px;">Reset Your Password</h1>                   <p style="color:#555555; font-size:16px; margin:0 0 30px;">Hi ${values.name}, please use the code below to reset your password.</p>                   <div style="display:inline-block; font-size:32px; font-weight:bold; color:#2980b9; background:#f1f3f6; padding:20px 40px; border-radius:8px; box-shadow: inset 0 3px 6px rgba(0,0,0,0.05); margin-bottom:30px;">${values.otp}</div>                   <p style="color:#777777; font-size:14px; margin:0;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>                 </td>               </tr>               <tr>                 <td style="background:#f9fafc; padding:20px; text-align:center; font-size:12px; color:#999999;">
                                  </td>               </tr>             </table>           </td>         </tr>       </table>     </body>
    `,
  }
}

const resendOtp = (values: {
  email: string
  name: string
  otp: string
  type: 'resetPassword' | 'createAccount'
}) => {
  const isReset = values.type === 'resetPassword'
  return {
    to: values.email,
    subject: `${isReset ? 'Password Reset' : 'Account Verification'} - New Code`,
    html: `     <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">         <tr>           <td align="center">             <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">               <tr>                 <td style="padding: 30px; text-align:center;">                   <img src="/images/logo.png" alt="Company Logo" style="width:140px; height:auto; display:block; margin:0 auto;">                 </td>               </tr>               <tr>                 <td style="padding: 40px; text-align:center;">                   <h1 style="color:#2c3e50; font-size:26px; margin:0 0 20px;">New ${isReset ? 'Password Reset' : 'Account Verification'} Code</h1>                   <p style="color:#555555; font-size:16px; margin:0 0 30px;">Hi ${values.name}, you requested a new ${isReset ? 'password reset' : 'verification'} code:</p>                   <div style="display:inline-block; font-size:32px; font-weight:bold; color:#2980b9; background:#f1f3f6; padding:20px 40px; border-radius:8px; box-shadow: inset 0 3px 6px rgba(0,0,0,0.05); margin-bottom:30px;">${values.otp}</div>                   <p style="color:#777777; font-size:14px; margin:0;">This code expires in 5 minutes. Please do not share it with anyone.</p>                 </td>               </tr>               <tr>                 <td style="background:#f9fafc; padding:20px; text-align:center; font-size:12px; color:#999999;">
                                  </td>               </tr>             </table>           </td>         </tr>       </table>     </body>
    `,
  }
}

export interface IStaffCreateEmail {
  name: string
  email: string
  role: string
  otp: string
}

const subscriptionWelcome = (values: {
  name: string
  email: string
  planName: string
  planPrice: number
  planInterval: string
  isTrialing: boolean
  trialDays?: number
  trialEndDate?: Date
  features: string[]
  dashboardUrl: string
}) => {
  return {
    to: values.email,
    subject: `Welcome to ${values.planName} Plan!`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#2980b9;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Welcome to ${values.planName}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Thank you for subscribing to our <strong>${values.planName}</strong> plan!</p>
                    
                    ${
                      values.isTrialing
                        ? `
                    <div style="background:#e8f4fd; padding:20px; border-radius:8px; margin-bottom:20px;">
                      <p style="color:#2980b9; font-weight:bold; margin:0 0 10px;">Your free trial has started!</p>
                      <p style="color:#555555; margin:0;">You have ${values.trialDays} days to explore all features. Your trial ends on ${values.trialEndDate?.toLocaleDateString()}.</p>
                    </div>
                    `
                        : ''
                    }

                    <p style="color:#2c3e50; font-size:18px; font-weight:bold; margin:0 0 15px;">Plan Details:</p>
                    <ul style="color:#555555; font-size:15px; line-height:1.6; margin:0 0 30px;">
                      <li><strong>Plan:</strong> ${values.planName}</li>
                      <li><strong>Price:</strong> $${values.planPrice}/${values.planInterval}</li>
                    </ul>

                    <p style="color:#2c3e50; font-size:18px; font-weight:bold; margin:0 0 15px;">Features Included:</p>
                    <ul style="color:#555555; font-size:15px; line-height:1.6; margin:0 0 30px;">
                      ${values.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>

                    <div style="text-align:center;">
                      <a href="${values.dashboardUrl}" style="display:inline-block; background:#2980b9; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Go to Dashboard</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const trialEnding = (values: {
  name: string
  email: string
  planName: string
  daysLeft: number
  trialEndDate: Date
  planPrice: number
  planInterval: string
  upgradeUrl: string
}) => {
  return {
    to: values.email,
    subject: `Your trial for ${values.planName} is ending soon!`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#f39c12;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Trial Ending Soon</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Your free trial for <strong>${values.planName}</strong> will expire in <strong>${values.daysLeft} days</strong> (on ${values.trialEndDate.toLocaleDateString()}).</p>
                    
                    <p style="color:#555555; font-size:16px; margin:0 0 30px;">To continue enjoying all the premium features, please make sure your payment information is up to date. You will be charged $${values.planPrice}/${values.planInterval} when the trial ends.</p>

                    <div style="text-align:center;">
                      <a href="${values.upgradeUrl}" style="display:inline-block; background:#f39c12; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Manage Subscription</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const paymentSuccess = (values: {
  name: string
  email: string
  invoiceNumber: string
  amount: string
  currency: string
  paymentDate: Date
  nextPaymentDate: Date
  invoiceUrl?: string
  dashboardUrl: string
}) => {
  return {
    to: values.email,
    subject: `Payment Successful - Invoice ${values.invoiceNumber}`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#27ae60;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Payment Successful</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 30px;">Your payment of <strong>${values.amount} ${values.currency}</strong> has been processed successfully.</p>
                    
                    <div style="background:#f9fafc; padding:20px; border-radius:8px; margin-bottom:30px;">
                      <table width="100%">
                        <tr><td style="color:#777777; padding:5px 0;">Invoice Number:</td><td style="text-align:right; font-weight:bold;">${values.invoiceNumber}</td></tr>
                        <tr><td style="color:#777777; padding:5px 0;">Payment Date:</td><td style="text-align:right; font-weight:bold;">${values.paymentDate.toLocaleDateString()}</td></tr>
                        <tr><td style="color:#777777; padding:5px 0;">Next Billing Date:</td><td style="text-align:right; font-weight:bold;">${values.nextPaymentDate.toLocaleDateString()}</td></tr>
                      </table>
                    </div>

                    <div style="text-align:center;">
                      ${values.invoiceUrl ? `<a href="${values.invoiceUrl}" style="display:inline-block; background:#27ae60; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold; margin-right:10px;">View Invoice</a>` : ''}
                      <a href="${values.dashboardUrl}" style="display:inline-block; border:2px solid #27ae60; color:#27ae60; padding:13px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Go to Dashboard</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const paymentFailed = (values: {
  name: string
  email: string
  planName: string
  amount: string
  currency: string
  failureReason: string
  retryDate: Date
  updatePaymentUrl: string
  dashboardUrl: string
}) => {
  return {
    to: values.email,
    subject: `Action Required: Payment Failed for your subscription`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#e74c3c;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Payment Failed</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">We were unable to process your payment of <strong>${values.amount} ${values.currency}</strong> for your subscription.</p>
                    
                    <div style="background:#fdeaea; padding:20px; border-radius:8px; margin-bottom:30px;">
                      <p style="color:#c0392b; margin:0 0 10px;"><strong>Reason:</strong> ${values.failureReason}</p>
                      <p style="color:#555555; margin:0;">We will automatically retry the payment on ${values.retryDate.toLocaleDateString()}. To avoid service interruption, please update your payment method.</p>
                    </div>

                    <div style="text-align:center;">
                      <a href="${values.updatePaymentUrl}" style="display:inline-block; background:#e74c3c; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Update Payment Method</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const subscriptionCanceled = (values: {
  name: string
  email: string
  planName: string
  canceledAt: Date
  accessUntil: Date
  feedbackUrl: string
  reactivateUrl: string
}) => {
  return {
    to: values.email,
    subject: `Subscription Canceled - We're sorry to see you go`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#7f8c8d;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Subscription Canceled</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Your subscription to <strong>${values.planName}</strong> has been canceled.</p>
                    
                    <p style="color:#555555; font-size:16px; margin:0 0 30px;">You will still have access to your premium features until <strong>${values.accessUntil.toLocaleDateString()}</strong>.</p>

                    <div style="text-align:center; margin-bottom:30px;">
                      <a href="${values.reactivateUrl}" style="display:inline-block; background:#34495e; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold; margin-right:10px;">Reactivate Plan</a>
                      <a href="${values.feedbackUrl}" style="display:inline-block; border:2px solid #7f8c8d; color:#7f8c8d; padding:13px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Give Feedback</a>
                    </div>
                    
                    <p style="color:#777777; font-size:14px; text-align:center;">We'd love to know why you're leaving and how we can improve.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

const planChange = (values: {
  name: string
  email: string
  newPlanName: string
  newPlanPrice: number
  planInterval: string
  isUpgrade: boolean
  priceDifference: number
  prorationNote: string
  features: string[]
  dashboardUrl: string
  billingUrl: string
}) => {
  return {
    to: values.email,
    subject: `Plan Changed to ${values.newPlanName}`,
    html: `
      <body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 20px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
                <tr>
                  <td style="padding: 30px; text-align:center; background:#8e44ad;">
                    <h1 style="color:#ffffff; font-size:26px; margin:0;">Plan Successfully Changed</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color:#555555; font-size:16px; margin:0 0 20px;">Hi ${values.name},</p>
                    <p style="color:#555555; font-size:16px; margin:0 0 30px;">You've successfully switched to the <strong>${values.newPlanName}</strong> plan.</p>
                    
                    <div style="background:#f4f0f9; padding:20px; border-radius:8px; margin-bottom:30px;">
                      <p style="color:#8e44ad; font-weight:bold; margin:0 0 10px;">Change Details:</p>
                      <p style="color:#555555; margin:0 0 5px;"><strong>New Plan:</strong> ${values.newPlanName}</p>
                      <p style="color:#555555; margin:0 0 5px;"><strong>New Price:</strong> $${values.newPlanPrice}/${values.planInterval}</p>
                      <p style="color:#555555; margin:10px 0 0; font-style:italic; font-size:14px;">${values.prorationNote}</p>
                    </div>

                    <p style="color:#2c3e50; font-size:18px; font-weight:bold; margin:0 0 15px;">Your New Features:</p>
                    <ul style="color:#555555; font-size:15px; line-height:1.6; margin:0 0 30px;">
                      ${values.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>

                    <div style="text-align:center;">
                      <a href="${values.dashboardUrl}" style="display:inline-block; background:#8e44ad; color:#ffffff; padding:15px 30px; border-radius:8px; text-decoration:none; font-weight:bold; margin-right:10px;">Go to Dashboard</a>
                      <a href="${values.billingUrl}" style="display:inline-block; border:2px solid #8e44ad; color:#8e44ad; padding:13px 30px; border-radius:8px; text-decoration:none; font-weight:bold;">Manage Billing</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    `,
  }
}

export const emailTemplate = {
  createAccount,
  resetPassword,
  resendOtp,
  subscriptionWelcome,
  trialEnding,
  paymentSuccess,
  paymentFailed,
  subscriptionCanceled,
  planChange,
}
