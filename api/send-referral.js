// api/send-referral.js — sends a referral invite from one tester to a friend

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { referrerName, referrerEmail, friendEmail, toolUrl } = req.body;
  if (!friendEmail || !friendEmail.includes('@')) {
    return res.status(400).json({ error: 'Invalid friend email' });
  }

  const senderFirst = referrerName ? referrerName.split(' ')[0] : 'Someone';
  const toolLink = toolUrl || process.env.TOOL_URL || 'https://test.anaudiencefromanywhere.com';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: process.env.SENDING_EMAIL || 'score@contact.anaudiencefromanywhere.com',
        reply_to: referrerEmail || undefined,
        to: [friendEmail],
        subject: `${senderFirst} thought you should take The Camera Score™`,
        html: `
          <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:40px 20px;background:#ffffff;">
            <p style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin-bottom:32px;">An Audience From Anywhere · Adrian Roup</p>
            <h1 style="font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;color:#080808;margin-bottom:16px;">The Camera Score™</h1>
            <p style="font-size:16px;color:#444;line-height:1.65;margin-bottom:8px;">Hi,</p>
            <p style="font-size:16px;color:#444;line-height:1.65;margin-bottom:8px;">${senderFirst} just ran their camera setup through The Camera Score™ and thought you should too.</p>
            <p style="font-size:16px;color:#444;line-height:1.65;margin-bottom:32px;">Upload a screenshot of your video setup. The tool analyses your lighting, framing, background, and presence — and gives you a score with a full breakdown. It takes 60 seconds.</p>
            <a href="${toolLink}" style="display:inline-block;background:#C0392B;color:#ffffff;text-decoration:none;padding:16px 32px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:4px;margin-bottom:32px;">Take The Camera Score™ →</a>
            <p style="font-size:13px;color:#999;line-height:1.6;">The Camera Score™ is a free tool from <em>An Audience From Anywhere</em> by Adrian Roup — a book about what the camera sees when it looks at you.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:32px 0;">
            <p style="font-size:12px;color:#bbb;">© 2026 An Audience From Anywhere · Adrian Roup · Santa Monica, CA</p>
          </div>`
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Email send failed', detail: err.slice(0, 200) });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
