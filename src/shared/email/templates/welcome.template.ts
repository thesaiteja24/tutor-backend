export function renderWelcomeEmail(data: { displayName: string }): { subject: string; html: string; text: string } {
  const subject = `Welcome to AI English Tutor, ${data.displayName}! 🚀`;
  const text = `Hi ${data.displayName},\n\nYour account has been verified successfully! You are now ready to practice fluent, real-time spoken English with our AI personas.\n\nKey features you can explore:\n- Real-time voice conversations with Maya, Leo, Emma & David\n- Instant pronunciation & grammar upgrade recasts\n- Interactive Practice Modes (Roleplay, Vocabulary, Email Drafting)\n- Personalized analytics & skill tracking\n\nStart your first session today!\n\nHappy Speaking,\nThe AI Tutor Team`;

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
              <div style="display: inline-block; background: linear-gradient(135deg, #10B981, #06B6D4); width: 48px; height: 48px; border-radius: 14px; text-align: center; line-height: 48px; font-size: 24px;">🎉</div>
              <h1 style="margin: 16px 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">Welcome Aboard!</h1>
              <p style="margin: 0; font-size: 14px; color: #94A3B8;">Hi ${data.displayName}, your email is now verified.</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0 20px 0;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #CBD5E1; line-height: 22px;">
                You're all set to build speaking confidence through real-time conversational practice with sub-1 second latency voice tutors.
              </p>
              <div style="background-color: #0F172A; border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 20px;">
                <div style="font-size: 13px; font-weight: 700; color: #A78BFA; margin-bottom: 8px;">✨ What to try first:</div>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #94A3B8; line-height: 20px;">
                  <li>Pick your favorite tutor persona (Maya, Leo, Emma, or David)</li>
                  <li>Try a 2-minute spontaneous conversation or roleplay drill</li>
                  <li>Check your pronunciation and grammar upgrades in real time</li>
                </ul>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B;">
                Need help or have questions? Reach out anytime to support@tutor.app.
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
