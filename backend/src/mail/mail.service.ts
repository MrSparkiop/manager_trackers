import { Injectable } from '@nestjs/common'
import { MailerService } from '@nestjs-modules/mailer'

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendPasswordReset(email: string, firstName: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`

    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset your TrackFlow password',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 520px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏱ TrackFlow</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Schedule Manager</p>
          </div>
          <div style="padding: 36px;">
            <h2 style="color: #ffffff; margin: 0 0 12px; font-size: 20px;">Reset your password</h2>
            <p style="color: #94a3b8; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">
              Hi ${firstName}, we received a request to reset your password. Click the button below to create a new one.
            </p>
            <a href="${resetUrl}" style="
              display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6);
              color: #ffffff; text-decoration: none; padding: 14px 32px;
              border-radius: 10px; font-weight: 600; font-size: 15px;
              box-shadow: 0 4px 20px rgba(99,102,241,0.4);
            ">
              Reset Password →
            </a>
            <p style="color: #475569; margin: 24px 0 0; font-size: 13px;">
              This link expires in <strong style="color: #94a3b8;">1 hour</strong>. If you didn't request a reset, you can safely ignore this email.
            </p>
          </div>
          <div style="padding: 20px 36px; border-top: 1px solid #1e293b;">
            <p style="color: #334155; margin: 0; font-size: 12px;">
              Or copy this link: <span style="color: #6366f1;">${resetUrl}</span>
            </p>
          </div>
        </div>
      `,
    })
  }
}