// api/send-results.js — sends score results email via Resend
// Traffic lights only. One fix. Poem with movie title. Part reference. No sub-scores. No prices. No dates.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, overall, lightingSignal, signals } = req.body;
  if (!email || overall === undefined) return res.status(400).json({ error: 'Missing email or score' });

  // ─── Traffic light values ───────────────────────────────────────────────
  // signals: { lighting: 'green'|'amber'|'red', angle: ..., background: ..., framing: ..., presence: ... }
  // lightingSignal is the client-side computed value (takes priority for lighting)
  const sig = signals || {};
  const lightingColor = (lightingSignal || sig.lighting || 'amber').toLowerCase();
  const angleColor    = (sig.angle      || 'amber').toLowerCase();
  const bgColor       = (sig.background || 'amber').toLowerCase();
  const framingColor  = (sig.framing    || 'amber').toLowerCase();
  const presenceColor = (sig.presence   || 'amber').toLowerCase();

  // ─── Determine the worst signal (for email poem selection) ──────────────
  // Priority: red > amber > green. Among reds, pick the one with the highest weight.
  // Weights: lighting 0.25, angle 0.20, background 0.20, framing 0.20, presence 0.15
  const criteriaWeights = [
    { key: 'lighting',  signal: lightingColor, weight: 0.25 },
    { key: 'angle',     signal: angleColor,    weight: 0.20 },
    { key: 'background',signal: bgColor,       weight: 0.20 },
    { key: 'framing',   signal: framingColor,  weight: 0.20 },
    { key: 'presence',  signal: presenceColor, weight: 0.15 },
  ];

  const signalRank = { red: 0, amber: 1, green: 2 };
  const sorted = [...criteriaWeights].sort((a, b) => {
    const rankDiff = signalRank[a.signal] - signalRank[b.signal];
    if (rankDiff !== 0) return rankDiff;
    return b.weight - a.weight; // tie-break: higher weight first
  });
  const worstCriterion = sorted[0];

  // ─── Poem + fix content per criterion ───────────────────────────────────
  // Each: { movie, poem (HTML), fix, part }

  const content = {
    lighting: {
      movie: 'Rear Window',
      poem: `Your background found the spotlight.<br>Your face did not.<br>Hitchcock shot <em>Rear Window</em> from one angle,<br>and he made sure the light hit what mattered.`,
      fix: 'Add a light source in front of you — even a desk lamp pointed at a white wall behind your screen will shift the balance. Your face should be the brightest thing in the frame.',
      part: 'Part III: The Craft',
    },
    angle: {
      movie: 'Lawrence of Arabia',
      poem: `The desert is vast. The frame is small.<br><em>Lawrence of Arabia</em> fills it — eye level,<br>horizon behind him, not above him.<br>Raise the camera. Meet it eye to eye.`,
      fix: 'Elevate your camera to eye level or just above. Stack some books under the laptop, or move to a proper monitor. Eye level reads as a peer. Below eye level reads as a ceiling fan.',
      part: 'Part II: The World Changed. Did You?',
    },
    background: {
      movie: 'Garden State',
      poem: `In <em>Garden State</em>, Zach Braff wears a wallpaper shirt<br>so he disappears into the background.<br>Yours is doing something similar.<br>You, however, are not trying to disappear.`,
      fix: 'Put some distance between you and what\'s behind you. Close the blind. Move the chair. The background should be visibly softer than your face, not competing for attention.',
      part: 'Part IV: The Room You\'re Actually In',
    },
    framing: {
      movie: 'Home Alone',
      poem: `<em>Home Alone</em> opens on a face<br>filling the frame — cheeks, eyes, chin, all of it.<br>The camera knows what it\'s here for.<br>Step back. Give it something to hold onto.`,
      fix: 'Your face should fill roughly half to two thirds of the frame. Eyes in the upper third. Shoulders visible. If the camera is seeing your forehead and not much else, back away from it.',
      part: 'Part II: The World Changed. Did You?',
    },
    presence: {
      movie: 'The Shining',
      poem: `Kubrick held the camera on Nicholson for thirty seconds<br>before he said a word. The audience didn\'t look away.<br>In <em>The Shining</em>, the eyes do the talking.<br>Find the dot. Look at it. Speak to it.`,
      fix: 'Look directly at the camera lens, not at your own image on screen. Stick a small piece of tape just below the camera to give yourself a target. Eye contact on camera is the whole game.',
      part: 'Part I: What Has Always Been True',
    },
  };

  // ─── If all green — positive email ──────────────────────────────────────
  const allGreen = criteriaWeights.every(c => c.signal === 'green');
  const allAmberOrGreen = criteriaWeights.every(c => c.signal !== 'red');

  // ─── Traffic light HTML helper ───────────────────────────────────────────
  const tlColor = { green: '#2a9d5c', amber: '#d4860b', red: '#c0392b' };
  const tlLabel = { green: 'Green', amber: 'Amber', red: 'Red' };

  function trafficLight(signal, label) {
    const col = tlColor[signal] || tlColor.amber;
    const lbl = label;
    return `
      <tr>
        <td style="padding:7px 0;vertical-align:middle;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <div style="width:12px;height:12px;border-radius:50%;background:${col};display:inline-block;"></div>
              </td>
              <td style="font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.04em;color:#333;vertical-align:middle;">${lbl}</td>
            </tr>
          </table>
        </td>
      </tr>`;
  }

  const lightsHtml = `
    <table cellpadding="0" cellspacing="0" border="0">
      ${trafficLight(lightingColor,  'Lighting')}
      ${trafficLight(angleColor,     'Camera angle')}
      ${trafficLight(bgColor,        'Background')}
      ${trafficLight(framingColor,   'Framing')}
      ${trafficLight(presenceColor,  'Presence')}
    </table>`;

  // ─── Choose email body ────────────────────────────────────────────────────
  let poemHtml, fixHtml, partRef, subjectSuffix;

  if (allGreen) {
    poemHtml = `The camera found you.<br>All of you. Eyes, frame, light, background — <em>The Sound of Music</em><br>could not have staged it better.<br>The hills are alive. So is your setup.`;
    fixHtml = 'There is nothing blocking you right now. The camera is not the problem. The next variable to work on is what you say when you have its full attention.';
    partRef = 'Part V: Now Make It Yours';
    subjectSuffix = 'The camera found you.';
  } else {
    const c = content[worstCriterion.key] || content.lighting;
    poemHtml = c.poem;
    fixHtml  = c.fix;
    partRef  = c.part;
    subjectSuffix = worstCriterion.signal === 'red' ? 'One thing to fix.' : 'Getting closer.';
  }

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
      </td></tr>

      <!-- Traffic lights -->
      <tr><td style="padding:24px 40px 0 40px;">
        <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#888;margin:0 0 14px 0;">Your Camera Presence Score™</p>
        ${lightsHtml}
      </td></tr>

      <!-- Poem -->
      <tr><td style="padding:28px 40px 0 40px;">
        <p style="font-family:Georgia,serif;font-size:15px;color:#444;line-height:1.75;font-style:italic;margin:0;">${poemHtml}</p>
      </td></tr>

      <!-- Fix -->
      <tr><td style="padding:24px 40px 0 40px;">
        <p style="font-family:Georgia,serif;font-size:15px;color:#333;line-height:1.7;margin:0;"><strong>The fix:</strong> ${fixHtml}</p>
      </td></tr>

      <!-- Part reference -->
      <tr><td style="padding:20px 40px 0 40px;">
        <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#aaa;margin:0;">From the book &nbsp;·&nbsp; <span style="color:#888;">${partRef}</span></p>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:28px 40px 0 40px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:#0c0b0a;border-radius:3px;">
            <a href="https://anaudiencefromanywhere.com/preorder.html" style="display:inline-block;padding:13px 26px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#edebe6;text-decoration:none;">Pre-order the book →</a>
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:36px 40px 40px 40px;">
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
        subject: `Your Camera Presence Score™ — ${subjectSuffix}`,
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
