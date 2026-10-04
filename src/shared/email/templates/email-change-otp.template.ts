export function renderEmailChangeOtpEmail(data: { displayName: string; otp: string }): { subject: string; html: string; text: string } {
  const subject = `${data.otp} is your verification code to change your email`;
  const text = `Hi ${data.displayName},\n\nYou recently requested to change the email address associated with your AI English Tutor account to this address.\n\nYour 6-digit confirmation code is: ${data.otp}\n\nThis code will expire in 10 minutes. If you did not request this change, please ignore this email.\n\nBest,\nThe AI English Tutor Team`;

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
            <td align="center" style="padding-bottom: 20px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #6366F1, #3B82F6); width: 48px; height: 48px; border-radius: 14px; text-align: center; line-height: 48px; font-size: 24px;">📧</div>
              <h1 style="margin: 16px 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">Verify New Email</h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8;">AI English Tutor Account Security</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0 24px 0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #CBD5E1; line-height: 22px;">
                Hi ${data.displayName}, we received a request to update your account email to this address. Use the 6-digit code below to confirm:
              </p>
              <div style="background-color: #0F172A; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #60A5FA; font-family: monospace;">${data.otp}</span>
              </div>
              <p style="margin: 0; font-size: 13px; color: #94A3B8; line-height: 20px;">
                ⏱️ This code will expire in <strong>10 minutes</strong>. Never share this code with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 18px;">
                If you did not request to update your email address, please ignore this email or contact support.
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
