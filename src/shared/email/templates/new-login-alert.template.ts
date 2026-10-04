export function renderNewLoginAlertEmail(data: {
  displayName: string;
  ipAddress?: string;
  userAgent?: string;
  loginTime?: string;
}): { subject: string; html: string; text: string } {
  const timeStr = data.loginTime || new Date().toUTCString();
  const subject = "New sign-in to your AI English Tutor account";
  const text = `Hi ${data.displayName},\n\nA new sign-in was detected on your AI English Tutor account.\n\nTime: ${timeStr}\nIP Address: ${data.ipAddress || "Unknown"}\nDevice: ${data.userAgent || "Mobile Application"}\n\nIf this was you, you can ignore this alert.\n\nIf this wasn't you, please reset your password immediately at support@tutor.app.\n\nBest,\nThe AI Tutor Security Team`;

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
              <div style="display: inline-block; background: linear-gradient(135deg, #6366F1, #3B82F6); width: 48px; height: 48px; border-radius: 14px; text-align: center; line-height: 48px; font-size: 24px;">🔑</div>
              <h1 style="margin: 16px 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">New Sign-in Detected</h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8;">Security Notification for ${data.displayName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0 20px 0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #CBD5E1; line-height: 22px;">
                We noticed a recent login to your account with the following details:
              </p>
              <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 16px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 13px;">
                  <tr>
                    <td style="color: #64748B; width: 90px;">Time:</td>
                    <td style="color: #E2E8F0; font-weight: 600;">${timeStr}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748B;">IP Address:</td>
                    <td style="color: #E2E8F0; font-family: monospace;">${data.ipAddress || "Unknown"}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748B;">Device/Client:</td>
                    <td style="color: #E2E8F0; font-size: 12px;">${data.userAgent || "Mobile App"}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 18px;">
                If this was you, you can safely ignore this alert. If you suspect unauthorized access, please reset your password immediately.
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
