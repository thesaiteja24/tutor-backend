export function renderPasswordResetOtpEmail(data: { displayName: string; otp: string }): { subject: string; html: string; text: string } {
  const subject = `${data.otp} is your password reset code`;
  const text = `Hi ${data.displayName},\n\nWe received a request to reset your password for your AI English Tutor account.\n\nYour 6-digit password reset code is: ${data.otp}\n\nThis code will expire in 10 minutes. If you did not request this password reset, please ignore this email or contact security if you suspect unauthorized access.\n\nBest,\nThe AI Tutor Security Team`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0F19; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #141B2D; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #F59E0B, #EF4444); width: 48px; height: 48px; border-radius: 14px; text-align: center; line-height: 48px; font-size: 24px;">🔒</div>
              <h1 style="margin: 16px 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">Password Reset Request</h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8;">Hi ${data.displayName}, let's secure your account.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 0; text-align: center;">
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #CBD5E1; line-height: 22px;">
                Enter this 6-digit code in the app to create a new password:
              </p>
              <div style="background-color: #0F172A; border: 1px solid #F59E0B; border-radius: 14px; padding: 18px; margin: 0 auto; display: inline-block; min-width: 240px; letter-spacing: 10px; font-size: 32px; font-weight: 800; color: #FBBF24; font-family: monospace;">
                ${data.otp}
              </div>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748B;">
                ⏱️ This reset code will expire in <strong>10 minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #EF4444; line-height: 18px;">
                ⚠️ If you did not request this password reset, please change your password immediately or contact support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
