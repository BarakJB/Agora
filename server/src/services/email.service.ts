import nodemailer from 'nodemailer';
import { logger } from '../config/logger.js';

export interface EmailSender {
  sendOTP(to: string, otp: string): Promise<void>;
}

class ConsoleEmailSender implements EmailSender {
  async sendOTP(to: string, otp: string): Promise<void> {
    logger.info({ to, otp }, 'OTP CODE (dev stub — configure SMTP_* in .env to send real email)');
  }
}

class NodemailerEmailSender implements EmailSender {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME } = process.env;

    if (!SMTP_USER || !SMTP_PASS) {
      throw new Error('Configure SMTP_USER and SMTP_PASS in .env');
    }

    this.fromAddress = `"${SMTP_FROM_NAME ?? 'PayAgent'}" <${SMTP_USER}>`;

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST ?? 'smtp.gmail.com',
      port: Number(SMTP_PORT ?? 587),
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  async sendOTP(to: string, otp: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1a3660;padding:28px 40px;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">PayAgent</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1a1a2e;">איפוס סיסמה</p>
              <p style="margin:0 0 32px;font-size:15px;color:#666;">קוד האימות שלך לאיפוס הסיסמה:</p>

              <div style="background:#f0f4ff;border-radius:10px;padding:28px;text-align:center;margin-bottom:32px;">
                <p style="margin:0;font-size:48px;font-weight:900;color:#1a3660;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</p>
              </div>

              <p style="margin:0 0 8px;font-size:14px;color:#888;">הקוד תקף לעשר דקות בלבד.</p>
              <p style="margin:0;font-size:14px;color:#888;">אם לא ביקשת לאפס סיסמה — התעלם מהמייל הזה.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">PayAgent &mdash; מערכת ניהול עמלות לסוכני ביטוח</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `PayAgent — איפוס סיסמה\n\nקוד האימות שלך: ${otp}\n\nהקוד תקף לעשר דקות.\nאם לא ביקשת לאפס סיסמה — התעלם מהמייל.\n\nPayAgent`;

    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject: `קוד אימות לאיפוס סיסמה — PayAgent`,
      text,
      html,
    });
  }
}

export function getEmailSender(): EmailSender {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return new NodemailerEmailSender();
  }
  return new ConsoleEmailSender();
}
