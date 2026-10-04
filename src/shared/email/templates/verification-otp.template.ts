export function renderVerificationOtpEmail(data: { displayName: string; otp: string }): { subject: string; html: string; text: string } {
  const subject = `${data.otp} is your AI English Tutor verification code`;
  const text = `Hi ${data.displayName},\n\nWelcome to AI English Tutor! Your 6-digit email verification code is: ${data.otp}\n\nThis code will expire in 10 minutes. If you did not create an account, you can safely ignore this email.\n\nHappy Speaking,\nThe AI Tutor Team`;

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
              <div style="display: inline-block; background: linear-gradient(135deg, #6366F1, #8B5CF6); width: 48px; height: 48px; border-radius: 14px; text-align: center; line-height: 48px; font-size: 24px;">✨</div>
              <h1 style="margin: 16px 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">Verify Your Email</h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8;">Welcome to AI English Tutor, ${data.displayName}!</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 0; text-align: center;">
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #CBD5E1; line-height: 22px;">
                Use the verification code below to confirm your email address and activate your interactive English practice sessions:
              </p>
              <div style="background-color: #0F172A; border: 1px solid #3B82F6; border-radius: 14px; padding: 18px; margin: 0 auto; display: inline-block; min-width: 240px; letter-spacing: 10px; font-size: 32px; font-weight: 800; color: #60A5FA; font-family: monospace;">
                ${data.otp}
              </div>
              <p style="margin: 20px 0 0 0; font-size: 12px; color: #64748B;">
                ⏱️ This code will expire in <strong>10 minutes</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 18px;">
                If you didn't request this verification code, someone may have entered your email by mistake. You can safely ignore this email.
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
