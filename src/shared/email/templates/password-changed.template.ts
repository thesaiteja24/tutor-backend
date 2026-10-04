export function renderPasswordChangedEmail(data: { displayName: string; changedAt?: string }): { subject: string; html: string; text: string } {
  const timeStr = data.changedAt || new Date().toUTCString();
  const subject = `Your AI English Tutor password was changed`;
  const text = `Hi ${data.displayName},\n\nYour password for AI English Tutor was successfully changed on ${timeStr}.\n\nIf you made this change, no further action is needed.\n\nIf you did NOT change your password, please contact support@tutor.app immediately to protect your account.\n\nBest,\nThe AI Tutor Security Team`;

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
              <div style="display: inline-block; background: linear-gradient(135deg, #10B981, #3B82F6); width: 48px; height: 48px; border-radius: 14px; text-align: center; line-height: 48px; font-size: 24px;">🛡️</div>
              <h1 style="margin: 16px 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">Password Updated</h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8;">Security Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0 20px 0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #CBD5E1; line-height: 22px;">
                Hi ${data.displayName}, your account password was changed successfully on <strong>${timeStr}</strong>.
              </p>
              <div style="background-color: #0F172A; border-left: 4px solid #10B981; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 13px; color: #94A3B8; line-height: 20px;">
                  If you performed this action, you can safely disregard this confirmation.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #EF4444; line-height: 18px;">
                ⚠️ If you did NOT make this change, please contact <strong>support@tutor.app</strong> immediately.
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
