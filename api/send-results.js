// api/send-results.js — sends score results email via Resend
// Traffic lights only. One fix. Poem with movie title. Part reference. No sub-scores. No prices. No dates.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, overall, lightingSignal, signals, disqualification } = req.body;
  if (!email || overall === undefined) return res.status(400).json({ error: 'Missing email or score' });

  // ─── Traffic light values ───────────────────────────────────────────────
  // signals: { lighting: 'green'|'amber'|'red', angle: ..., background: ..., framing: ..., presence: ... }
  // lightingSignal is the client-side computed value (takes priority for lighting)
  // If overall is 0 (no face / complete fail), force all signals red regardless of what was sent
  const noFace = (overall === 0);

  const sig = signals || {};
  const lightingColor = noFace ? 'red' : (lightingSignal || sig.lighting || 'red').toLowerCase();
  const angleColor    = noFace ? 'red' : (sig.angle      || 'red').toLowerCase();
  const bgColor       = noFace ? 'red' : (sig.background || 'red').toLowerCase();
  const framingColor  = noFace ? 'red' : (sig.framing    || 'red').toLowerCase();
  const presenceColor = noFace ? 'red' : (sig.presence   || 'red').toLowerCase();

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
  // ── Too-far framing override — bypasses weight sort ──
  // When client-side face area measurement confirms too far, framing is the
  // definitive worst criterion regardless of other signal weights.
  const { framingDirection = '' } = req.body;
  const worstCriterion = (framingDirection === 'too_far')
    ? { key: 'framing', signal: 'red', weight: 0.20 }
    : sorted[0];

  // ─── Poem + fix content per criterion ───────────────────────────────────
  // Each: { movie, poem (HTML), fix, part }

  // Base URL for illustrations served from Vercel public folder
  const BASE_URL = 'https://test.anaudiencefromanywhere.com';

  const content = {
    lighting: {
      movie: 'The Shawshank Redemption',
      subject: 'Have you seen the movie: The Shawshank Redemption?',
      illustration: `${BASE_URL}/illustration-larry-lighting.png`,
      poem: `Your lighting is working against you.<br><br>The camera exposes for the brightest thing in frame — and right now, that isn\'t your face. Your face loses every time.<br><br>Andy Dufresne spent nineteen years in Shawshank before he finally walked out into the&nbsp;light. You can fix yours by moving a lamp.`,
      fix: 'Put a light source — a lamp, a window, anything bright — in front of you, not behind you.',
      part: 'Part III: The Craft',
    },
    angle: {
      movie: 'Apocalypse Now',
      subject: 'Have you seen the movie: Apocalypse Now? Your camera is below eye level.',
      illustration: `${BASE_URL}/illustration-alan-angle.png`,
      poem: `Your camera angle is working against you.<br><br>When the angle is wrong, authority quietly exits the call. Too low means ceiling and nostrils. Too high means the top of a head. Either way, the geometry is doing something the person never agreed to.<br><br>Captain Willard opened Apocalypse Now flat on his back in a Saigon hotel room, staring at the ceiling fan. It was a cinematic choice. Your laptop at that angle is not.`,
      fix: 'Stack some books under your laptop — or raise the monitor — until the lens is level with your eyes.',
      part: 'Part II: The World Changed. Did You?',
    },
    background: {
      movie: 'Garden State',
      subject: 'Have you seen the movie: Garden State? Your background is competing with you.',
      illustration: `${BASE_URL}/illustration-brian-background.png`,
      poem: `Your background is pulling attention away from your face.<br><br>Audiences read the room — automatically, involuntarily. If the room is loud, they stop listening to you.<br><br>In <em>Garden State</em>, Zach Braff blends into a wallpaper pattern in his childhood bedroom. It\'s a metaphor. It is also what is happening on your calls.`,
      fix: 'Find a plain wall or a background the eye can settle on without working for it. Clear whatever is competing with your face.',
      part: 'Part IV: The Room You\'re Actually In',
    },
    framing: {
      movie: 'Home Alone',
      subject: 'Have you seen the movie: Home Alone? You\'re too close to the camera.',
      illustration: `${BASE_URL}/illustration-framing-close.png`,
      poem: `The frame is mostly your face — too much of it, not enough room around it.<br><br>The audience can\'t settle. They spend the whole call half-braced, like Kevin McCallister pressing his cheeks in the mirror, bracing for something that hasn\'t happened yet.`,
      fix: 'Back away from the camera until your shoulders are in frame and there\'s a little air above your head.',
      part: 'Part II: The World Changed. Did You?',
    },
    framing_far: {
      movie: 'Lawrence of Arabia',
      subject: 'Have you seen the movie: Lawrence of Arabia? You\'re too far from the camera.',
      illustration: `${BASE_URL}/illustration-Lawrence-distance.png`,
      poem: `You\'re too far from the camera — small in the frame, the whole room around you.<br><br>The audience has to hunt for your face. Most won\'t. You become scenery.<br><br>In <em>Lawrence of Arabia</em>, a man rides in as a speck on the horizon and takes a full minute to resolve into a face. Magnificent across a desert. Less so across a conference call.`,
      fix: 'Move closer, or bring the camera to you — until your shoulders fill the frame and your face reads without effort.',
      part: 'Part II: The World Changed. Did You?',
    },
    presence: {
      movie: '2001: A Space Odyssey',
      subject: 'Have you seen the movie: 2001: A Space Odyssey? You\'re not looking at the camera.',
      illustration: `${BASE_URL}/illustration-eddie-eyecontact.png`,
      poem: `You're not looking at the lens. Whatever you're looking at instead — your own tile, your notes, another screen — to everyone watching, you're looking slightly sideways for the entire call. It reads as distracted, uncertain, or — if they're being uncharitable — evasive.<br><br>HAL 9000 never blinked, never looked away, and somehow made "I'm sorry, Dave" feel like a threat. Eye contact is a tool. It works better when you use it.`,
      fix: 'Look at the small dot at the top of your screen — the lens, not your tile. A small sticker next to it helps your eyes find it automatically.',
      part: 'Part I: What Has Always Been True',
    },
  };

  // ─── If all green — positive email ──────────────────────────────────────
  const allGreen = criteriaWeights.every(c => c.signal === 'green');
  const allAmber = criteriaWeights.every(c => c.signal === 'amber');
  const hasRed   = criteriaWeights.some(c => c.signal === 'red');
  const redCount = criteriaWeights.filter(c => c.signal === 'red').length;
  const amberCount = criteriaWeights.filter(c => c.signal === 'amber').length;
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

  // ─── Disqualification scenarios ─────────────────────────────────────────
  const disqContent = {
    ring_light: {
      movie: 'The Hangover',
      subject: 'Have you seen the movie: The Hangover? Your ring light has questions.',
      illustration: `${BASE_URL}/illustration-ringlight-dentist.png`,
      poem: `Something got flagged in your camera presence score: the ring light.<br><br>Not because you have one. Having one is fine. The problem is where it's sitting — dead centre, straight ahead, pointed directly at the lens. That turns your eyes into two small moons and your face into a passport photo from a vending machine.<br><br>In <em>The Hangover</em>, four men wake up in a Las Vegas hotel suite with no memory, a tiger in the bathroom, and a missing groom. They have every resource they need. The problem is arrangement.<br><br>Same light. Wrong position.<br><br>The ring was <em>hung</em> wrong — and the <em>over</em>-exposure gave the game away.<br><br>They piece it back together. You can too.`,
      fix: 'Move the ring light to your 10 o\'clock or 2 o\'clock position — off-axis, angled toward your face at about 45 degrees. Or bounce it off a white wall behind your camera so the light wraps rather than blasts. Same light. Better result.',
      part: 'Part IV: The Room You\'re Actually In',
    },
    background_blur: {
      movie: 'Garden State',
      subject: 'Have you seen the movie: Garden State? Your background is competing with you.',
      illustration: `${BASE_URL}/illustration-brian-background.png`,
      poem: `Your background is pulling attention away from your face.<br><br>Audiences read the room — automatically, involuntarily. If the room is loud, they stop listening to you.<br><br>In <em>Garden State</em>, Zach Braff blends into a wallpaper pattern in his childhood bedroom. It\'s a metaphor. It is also what is happening on your calls.`,
      fix: 'Find a plain wall or a background the eye can settle on without working for it. Clear whatever is competing with your face.',
      part: 'Part IV: The Room You\'re Actually In',
    },
    bright_background: {
      movie: 'The Shawshank Redemption',
      subject: 'Have you seen the movie: The Shawshank Redemption?',
      illustration: `${BASE_URL}/illustration-larry-lighting.png`,
      poem: `Your background is distracting.<br><br>The camera exposes for the brightest thing in frame. Right now that's behind you. Your face loses every time.<br><br>Andy Dufresne spent nineteen years in Shawshank before he finally walked out into the&nbsp;light. You can fix yours by moving a lamp.`,
      fix: 'Put a light source — a lamp, a window, anything bright — in front of you, not behind you.',
      part: 'Part III: The Craft',
    },
  };

  // ─── Choose email body ────────────────────────────────────────────────────
  let poemHtml, fixHtml, partRef, subjectSuffix;
  let illustrationUrl = '';

  if (noFace && !disqualification) {
    // No face detected — all red, Groundhog Day email (all-red version)
    poemHtml = `Everything came back red.<br><br>Lighting, angle, background, framing, presence — all of it. Nothing is broken beyond repair. But right now, nothing is working either.<br><br>Phil Connors wakes up on February 2nd. Same alarm. Same Sonny and Cher. Same Punxsutawney. He doesn't have one thing to fix — he has everything to fix. His entire day is wrong from the moment it starts. And the only way out isn't to patch one thing. It's to understand that every single element of the day is connected. Change one, and the whole day starts to shift. Keep ignoring them, and the alarm goes off again tomorrow.<br><br>That's where you are. Not broken. Looping.<br><br>The good news — and there is good news — is that Phil got out. He learned piano. He learned ice sculpture. He caught a kid falling out of a tree. He did it one February 2nd at a time, one thing at a time, until the day finally looked different.<br><br>You have five things to fix. That's also five ways in.`;
    fixHtml = 'Start with your light source. Light affects everything downstream — angle, background, framing, how your face reads on screen. Get light to green first. Then come back and run the score again. You don\'t need to fix everything at once. You just need to make today a little less February 2nd than yesterday.';
    partRef = 'Part III: The Craft';
    subjectSuffix = 'Have you seen the movie: Groundhog Day? It\'s February 2nd. Again.';
    illustrationUrl = `${BASE_URL}/illustration-groundhog-whackamole.jpg`;
  } else if (disqualification && disqContent[disqualification]) {
    // Disqualification email
    const d = disqContent[disqualification];
    poemHtml       = d.poem;
    fixHtml        = d.fix;
    partRef        = d.part;
    subjectSuffix  = d.subject;
    illustrationUrl = d.illustration || '';
  } else if (allGreen) {
    poemHtml = `Nothing was flagged. Every criterion is green.<br><br>That means your light is good, your frame is good, your eye contact is there, and your background isn\'t stealing the show. You didn\'t skip steps. That puts you ahead of most people on most calls.<br><br>Ferris Bueller took a Ferrari, a parade, and an entire city just to feel alive for one afternoon. You set up a decent camera angle. Arguably more useful.`;
    fixHtml = 'Go make something worth watching.';
    partRef = 'Part V: Now Make It Yours';
    subjectSuffix = 'Have you seen the movie: Ferris Bueller\'s Day Off? You passed. All of it.';
    illustrationUrl = `${BASE_URL}/illustration-allgreen-ferris.png`;
  } else if (allAmber) {
    // All amber — Groundhog Day
    poemHtml = `Everything came back amber.<br><br>Not red. Nothing is broken. But nothing is landing cleanly either — lighting, angle, background, framing, presence, all sitting in that particular shade of <em>close but not quite</em>.<br><br>Phil Connors wakes up on February 2nd. Again. He's not failing. He's not succeeding. He's looping — same day, same choices, same Sonny and Cher at 6am, same slight wrongness that he can't quite put his finger on until he finally decides to actually change something.<br><br>Every amber you've got is a <em>ground</em> that could be firmer, a <em>hog</em> that keeps doubling back on itself, a <em>day</em> that could break differently if one thing shifted.<br><br>The good news: amber means you're most of the way there. Each fix is small. Any one of them changes the frame.`;
    fixHtml = 'Pick the one criterion that feels most fixable — start with your light source, since it affects everything downstream. Get that to green, then re-run the score. You don\'t need to fix everything at once. You just need to stop waking up on February 2nd.';
    partRef = 'Part III: The Craft';
    subjectSuffix = 'Have you seen the movie: Groundhog Day? You\'re almost there. Almost.';
    illustrationUrl = `${BASE_URL}/illustration-groundhog-whackamole.jpg`;
  } else if (redCount === 1 && amberCount >= 2) {
    // Mixed — The Big Lebowski
    const worst = content[worstCriterion.key] || content.lighting;
    // If the red criterion has its own film, use it — otherwise fall back to Big Lebowski
    if (worst && worst.subject) {
      poemHtml = worst.poem;
      fixHtml = worst.fix;
      partRef = worst.part || 'Part II: The World Changed. Did You?';
      subjectSuffix = worst.subject;
      illustrationUrl = worst.illustration || '';
    } else {
      poemHtml = `The score came back with one red criterion and a couple of ambers alongside it.<br><br>Not a disaster. Not a clean pass. The kind of result where you can see exactly what the problem is — you're just not quite pulling it together into one coherent picture yet.<br><br>The Dude is not incapable. He is, in many ways, a man with a clear philosophy, a regular schedule, and an extremely specific idea of what constitutes a good rug. The problem is that nothing quite lines up. The rug gets ruined. The wrong Lebowski gets contacted. Everything almost works.<br><br><em>The Big</em> issue isn't that you're missing by much. <em>Lebowski</em> logic applies: every element is doing its own thing, and they haven't agreed to cooperate yet.<br><br>The red one first. Fix that, and the ambers are easier to see clearly.`;
      fixHtml = worst ? worst.fix : '';
      partRef = 'Part II: The World Changed. Did You?';
      subjectSuffix = 'Have you seen the movie: The Big Lebowski? One red flag. A few amber ones.';
      illustrationUrl = `${BASE_URL}/illustration-dude-lebowski.jpg`;
    }
  } else if (worstCriterion.key === 'framing') {
    const { framingComment = '' } = req.body;
    let isTooFar;
    if (framingDirection === 'too_far') {
      // Primary signal: client-side face area measurement confirmed too far
      isTooFar = true;
    } else if (framingDirection === 'too_close' || framingDirection === 'ok') {
      isTooFar = false;
    } else {
      // Fallback: keyword scan of GPT-4o framing comment
      const fc = framingComment.toLowerCase();
      isTooFar = fc.includes('too far') ||
                 fc.includes('lawrence') ||
                 fc.includes('small in the frame') ||
                 fc.includes('small in frame') ||
                 fc.includes('surrounded by') ||
                 fc.includes('face unreadable') ||
                 fc.includes('subject is small') ||
                 fc.includes('face below 30') ||
                 fc.includes('face below 40');
    }
    const c = isTooFar ? content.framing_far : content.framing;
    poemHtml = c.poem;
    fixHtml  = c.fix;
    partRef  = c.part;
    subjectSuffix = c.subject;
    illustrationUrl = c.illustration || '';
  } else {
    const c = content[worstCriterion.key] || content.lighting;
    poemHtml = c.poem;
    fixHtml  = c.fix;
    partRef  = c.part;
    subjectSuffix = c.subject || (worstCriterion.signal === 'red' ? 'One thing to fix.' : 'Getting closer.');
    illustrationUrl = c.illustration || '';
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;">

      <!-- Header — branded dark bar -->
      <tr><td style="background:#0c0b0a;padding:28px 40px 22px 40px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <div style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#edebe6;line-height:1;">AFA</div>
              <div style="width:32px;height:2px;background:#C0392B;margin-top:6px;"></div>
              <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:rgba(237,235,230,0.45);margin-top:8px;">An Audience From Anywhere</div>
            </td>
            <td align="right" style="vertical-align:middle;">
              <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(237,235,230,0.35);">Camera Presence Score™</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Traffic lights -->
      <tr><td style="padding:24px 40px 0 40px;">
        <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#888;margin:0 0 14px 0;">Your Camera Presence Score™</p>
        ${lightsHtml}
      </td></tr>

      <!-- Illustration -->
      ${illustrationUrl ? `
      <tr><td style="padding:28px 40px 0 40px;">
        <img src="${illustrationUrl}" alt="" width="440" style="width:100%;max-width:440px;height:auto;display:block;border:0;" />
      </td></tr>` : ''}

      <!-- Poem -->
      <tr><td style="padding:28px 40px 0 40px;">
        <p style="font-family:Arial,sans-serif;font-size:15px;color:#444;line-height:1.75;margin:0;">${poemHtml}</p>
      </td></tr>

      <!-- Fix -->
      <tr><td style="padding:24px 40px 0 40px;">
        <p style="font-family:Arial,sans-serif;font-size:15px;color:#333;line-height:1.7;margin:0;"><strong>The fix:</strong> ${fixHtml}</p>
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
        subject: allGreen ? subjectSuffix : subjectSuffix,
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
