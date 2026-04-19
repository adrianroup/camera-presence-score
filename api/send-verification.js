// api/send-verification.js — sends verification email via Resend

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, token, toolUrl } = req.body;
  if (!email || !token) return res.status(400).json({ error: 'Missing email or token' });

  const firstName = name ? name.split(' ')[0] : 'there';
  const verifyUrl = `${toolUrl || process.env.TOOL_URL}?verify=${token}&email=${encodeURIComponent(email)}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: process.env.SENDING_EMAIL || 'score@contact.anaudiencefromanywhere.com',
        to: [email],
        subject: 'Verify your Camera Presence Score access',
        html: `
          <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:40px 20px;background:#ffffff;">
            <p style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin-bottom:32px;">An Audience From Anywhere · Adrian Roup</p>
            <h1 style="font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;color:#080808;margin-bottom:16px;">One click to your score</h1>
            <p style="font-size:16px;color:#444;line-height:1.65;margin-bottom:8px;">Hi ${firstName},</p>
            <p style="font-size:16px;color:#444;line-height:1.65;margin-bottom:32px;">Click the button below to verify your email and unlock your three free Camera Presence Score analyses. The camera has been waiting.</p>
            <a href="${verifyUrl}" style="display:inline-block;background:#E8501A;color:#ffffff;text-decoration:none;padding:16px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:4px;margin-bottom:32px;">Verify my email →</a>
            <p style="font-size:13px;color:#999;line-height:1.6;">This link expires in 24 hours. If you did not request this, ignore this email.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
            <p style="font-size:12px;color:#bbb;">© 2026 An Audience From Anywhere · Adrian Roup · Santa Monica, CA</p>
          </div>`
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Email send failed', detail: err.slice(0,200) });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
