import nodemailer from 'nodemailer'
import config from '../config'
import { ISendEmail } from '../interfaces/email'

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: Number(config.email.port),
  secure: Number(config.email.port) === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
})

const sendEmail = async (values: ISendEmail) => {
  try {
    const fromName = config.appName || 'Quran International'
    const info = await transporter.sendMail({
      from: `"${fromName}" <${config.email.from}>`,
      to: values.to,
      subject: values.subject,
      html: values.html,
    })

    console.log('Mail send successfully', info.accepted)
  } catch (error) {
    console.error('Email', error)
  }
}

export const emailHelper = {
  sendEmail,
}
