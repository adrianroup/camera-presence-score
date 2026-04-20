// api/send-results.js — sends score results email via Resend

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, overall, criteria } = req.body;
  if (!email || overall === undefined) return res.status(400).json({ error: 'Missing email or score' });

  const firstName = name ? name.split(' ')[0] : 'there';

  // Score tier messaging
  const tier = overall >= 80 ? 'strong'
             : overall >= 60 ? 'developing'
             : overall >= 40 ? 'needs work'
             : 'start here';

  const tierLine = overall >= 80
    ? `That's a strong foundation. Most people on calls today can't say the same.`
    : overall >= 60
    ? `You're ahead of most people on calls. There are a few things in the way — and they're fixable.`
    : overall >= 40
    ? `There's work to do. The good news: none of it requires expensive gear or a redesigned room.`
    : `The camera is working against you right now. That's not a judgment — it's a starting point.`;

  // Find the lowest scoring criterion for the top recommendation
  const criteriaList = criteria ? [
    { name: 'Lighting',        key: 'lighting',  score: criteria.lighting?.score  || 50, comment: criteria.lighting?.comment  || '', hint: criteria.lighting?.hint  || '', chapter: 'Chapter 7', chapterTitle: 'The Camera Is the Room' },
    { name: 'Camera Angle',    key: 'angle',     score: criteria.angle?.score     || 50, comment: criteria.angle?.comment     || '', hint: criteria.angle?.hint     || '', chapter: 'Chapter 7', chapterTitle: 'The Camera Is the Room' },
    { name: 'Background',      key: 'background',score: criteria.background?.score|| 50, comment: criteria.background?.comment|| '', hint: criteria.background?.hint|| '', chapter: 'Chapter 3', chapterTitle: 'The Room Before the Room' },
    { name: 'Framing',         key: 'framing',   score: criteria.framing?.score   || 50, comment: criteria.framing?.comment   || '', hint: criteria.framing?.hint   || '', chapter: 'Chapter 7', chapterTitle: 'The Camera Is the Room' },
    { name: 'Presence',        key: 'presence',  score: criteria.presence?.score  || 50, comment: criteria.presence?.comment  || '', hint: criteria.presence?.hint  || '', chapter: 'Chapter 1', chapterTitle: 'The Right Tools for the Right Reason' },
  ] : [];

  const sorted = [...criteriaList].sort((a, b) => a.score - b.score);
  const topIssue = sorted[0];
  const secondIssue = sorted[1];

  // Score colour
  const scoreColor = overall >= 80 ? '#2a9d5c'
                   : overall >= 60 ? '#E8501A'
                   : overall >= 40 ? '#c0392b'
                   : '#8b0000';

  // Build criteria rows HTML
  const criteriaRowsHtml = criteriaList.map(c => {
    const barWidth = Math.round(c.score);
    const barColor = c.score >= 80 ? '#2a9d5c' : c.score >= 60 ? '#E8501A' : '#c0392b';
    return `
      <tr>
        <td style="padding:10px 0 10px 0;border-bottom:1px solid #f0f0f0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#888;width:120px;vertical-align:middle;">${c.name}</td>
              <td style="vertical-align:middle;padding:0 12px;">
                <div style="background:#f0f0f0;border-radius:2px;height:4px;width:100%;">
                  <div style="background:${barColor};border-radius:2px;height:4px;width:${barWidth}%;"></div>
                </div>
              </td>
              <td style="font-family:Georgia,serif;font-size:15px;font-weight:700;color:${barColor};width:40px;text-align:right;vertical-align:middle;">${c.score}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding-top:5px;">
                <p style="font-family:Georgia,serif;font-size:13px;color:#666;line-height:1.5;margin:0;">${c.comment}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join('');

  const topIssueBlock = topIssue ? `
    <tr><td style="padding:32px 0 0 0;">
      <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#E8501A;margin:0 0 10px 0;">Your priority fix</p>
      <p style="font-family:Georgia,serif;font-size:16px;color:#080808;line-height:1.6;margin:0 0 8px 0;"><strong>${topIssue.name}.</strong> ${topIssue.hint}</p>
      ${secondIssue ? `<p style="font-family:Georgia,serif;font-size:15px;color:#555;line-height:1.6;margin:0;">After that: <strong>${secondIssue.name.toLowerCase()}.</strong> ${secondIssue.hint}</p>` : ''}
    </td></tr>` : '';

  const chapterTeaseBlock = topIssue ? `
    <tr><td style="padding:32px 0 0 0;border-top:1px solid #eeeeee;margin-top:32px;">
      <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#888;margin:0 0 12px 0;">From the book</p>
      <p style="font-family:Georgia,serif;font-size:15px;color:#444;line-height:1.7;margin:0 0 12px 0;">${topIssue.chapter} of <em>An Audience From Anywhere</em> is called <strong>"${topIssue.chapterTitle}."</strong> It's the one that speaks directly to what your score is pointing at.</p>
      <p style="font-family:Georgia,serif;font-size:15px;color:#444;line-height:1.7;margin:0;">The book doesn't tell you to buy better gear. It tells you what the camera is actually measuring — and why most people on calls today are solving the wrong problem.</p>
    </td></tr>` : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;">

      <!-- Header -->
      <tr><td style="padding:32px 40px 0 40px;">
        <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#aaaaaa;margin:0 0 24px 0;">An Audience From Anywhere &nbsp;·&nbsp; Adrian Roup</p>
        <p style="font-family:Georgia,serif;font-size:15px;color:#555;line-height:1.65;margin:0 0 0 0;">Hi ${firstName},</p>
      </td></tr>

      <!-- Score block -->
      <tr><td style="padding:28px 40px 0 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #eeeeee;">
          <tr>
            <td style="padding:24px 28px;vertical-align:middle;">
              <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#888;margin:0 0 6px 0;">Your Camera Presence Score™</p>
              <p style="font-family:Georgia,serif;font-size:52px;font-weight:700;color:${scoreColor};margin:0;line-height:1;">${overall}<span style="font-size:22px;color:#aaa;">/100</span></p>
              <p style="font-family:Georgia,serif;font-size:14px;color:#666;line-height:1.6;margin:8px 0 0 0;">${tierLine}</p>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Criteria breakdown -->
      <tr><td style="padding:28px 40px 0 40px;">
        <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#888;margin:0 0 16px 0;">Breakdown</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${criteriaRowsHtml}
        </table>
      </td></tr>

      <!-- Priority fix + chapter tease -->
      <tr><td style="padding:0 40px 0 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${topIssueBlock}
          <tr><td style="padding:32px 0 0 0;">&nbsp;</td></tr>
          ${chapterTeaseBlock}
        </table>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:32px 40px 0 40px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:#E8501A;border-radius:3px;">
            <a href="https://anaudiencefromanywhere.com" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;text-decoration:none;">Get the book →</a>
          </td></tr>
        </table>
        <p style="font-family:Georgia,serif;font-size:13px;color:#aaa;margin:12px 0 0 0;">Pre-order · $39.97 · Available now</p>
      </td></tr>

      <!-- Epigraph / sign-off -->
      <tr><td style="padding:40px 40px 0 40px;border-top:1px solid #eeeeee;margin-top:40px;">
        <p style="font-family:Georgia,serif;font-size:14px;color:#888;line-height:1.7;font-style:italic;margin:0 0 6px 0;">"We truly find out about a person by the way they negotiate their obstacles."</p>
        <p style="font-family:Arial,sans-serif;font-size:11px;color:#aaa;letter-spacing:0.08em;margin:0;">— Colin Firth, on preparing for <em>The King's Speech</em></p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:32px 40px 40px 40px;">
        <p style="font-family:Arial,sans-serif;font-size:11px;color:#cccccc;line-height:1.6;margin:0;">© 2026 An Audience From Anywhere · Adrian Roup · Santa Monica, CA<br>
        <a href="https://anaudiencefromanywhere.com" style="color:#cccccc;text-decoration:none;">anaudiencefromanywhere.com</a></p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

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
        subject: `Your Camera Presence Score: ${overall}/100`,
        html
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
