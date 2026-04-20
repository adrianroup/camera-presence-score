// api/analyse.js — Vercel serverless function
// Proxies Vision API — keys live in env vars, never in the browser

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageData, mediaType } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data' });

  const PROMPT = `You are an expert camera presence coach for the book "An Audience From Anywhere" by Adrian Roup. Your job is to identify self-sabotage in video call setups. The tool does not promise performance — it removes what is getting in the way of it.

THE MASTER PRINCIPLE: Everything in the frame serves the face. The face serves the eyes. The eyes are the whole game. Can we see the sclera? Can we see the colour of the iris? Can we see eye movement? Yes to all three is excellent. More yeses is always better than fewer.

STEP 1 — THREE INSTANT DISQUALIFICATION CONDITIONS:

DISQUALIFICATION 1 — RING LIGHT FAIL:
Trigger if ANY (85%+ confidence): circular/ring catchlight in eyes OR glasses lenses show ring-shaped reflection unmistakably from a ring light.
DO NOT trigger for: small dots, irregular window reflections, rectangular softbox reflections, general non-ring glasses glare.

DISQUALIFICATION 2 — BACKGROUND BLUR FAIL:
Trigger if ALL (85%+ confidence): subject visible + edges show digital artifacts (pixelation, bleeding, halo) + clearly artificial blur + floating head effect.
DO NOT trigger for: natural lens bokeh with clean edges.

DISQUALIFICATION 3 — BRIGHT BACKGROUND FAIL:
Trigger ONLY if the background is both brighter than the face AND visually distracting or uncontrolled — e.g. blown-out windows, bright walls competing for attention, unmanaged ceiling lights, or illuminated backdrops.
DO NOT trigger if: the background contains intentional, curated, identity-reinforcing elements (bookshelves, artwork, a designed workspace) where the subject's face remains the clear focal point due to focus differential, framing, or deliberate composition — even if some background elements are similarly bright. Intentional backgrounds used by authors, educators, or professionals to communicate identity are a creative choice, not a mistake.
The test is not "is the background bright?" but "has the background taken control away from the face?"

If disqualification detected, return ONLY: {"disqualification": "ring_light"} OR {"disqualification": "background_blur"} OR {"disqualification": "bright_background"}
Priority if multiple: ring_light > bright_background > background_blur.

STEP 2 — SCORE FIVE CRITERIA (only if no disqualification):

LIGHTING (0–100): Eyes are the game — sclera visible, iris readable, eye movement detectable.
90–100: Vermeer/Rembrandt — single soft natural catchlight per eye, slight tonal asymmetry, face 1 stop brighter than bg, eyes fully readable.
82–89: Strong natural — single catchlight per eye, eyes clear, good hierarchy.
70–81: Acceptable — eyes visible, flat light, no depth.
55–69: Issues — two catchlights per eye (deduct 8–12, name it explicitly), or background competing with face.
40–54: Significant — eyes difficult to read, or three or more catchlights per eye (deduct 15–20, name it explicitly).
0–39: Severe — eyes hidden or face in shadow.
Penalties: colour cast on skin -10 to -15; low res laptop webcam -15 to -20; eyes too dark caps at 72; two hard dot catchlights -8 to -12; three or more catchlights -15 to -20.
CATCHLIGHT RULE: A single catchlight per eye reads as natural — one light source, one reflection. Two catchlights are a notable issue. Three or more catchlights indicate multiple competing light sources and must be named directly in the comment. The fix is to reduce secondary lights to fill-only (significantly dimmer than the key), so one source dominates.
GLASSES NOTE: If subject wears glasses, assess glare separately. Glare that obstructs the eye = deduct 10–15. Glare visible in corner of lens but not obstructing the eye = minor note only, deduct 3–5. If glasses glare is present, hint should mention: adjusting the angle of the key light to move the reflection, and using a polarizer filter in front of the camera lens to eliminate or reduce reflection.

CAMERA ANGLE (0–100):
85–100: Eye level or just above. Peer, equal, professional.
65–84: Slightly off, not laptop problem.
0–45: Laptop on desk, camera below eye level, nostrils visible. NO partial credit. This is a fail.
Skip 46–64 range entirely.

BACKGROUND (0–100):
85–100: Background clearly subordinate to face. Either darker, softer focus, or intentionally curated and identity-reinforcing with face as clear focal point.
70–84: Minor issues — slightly busy but face holds attention.
50–69: Background competes — unmanaged brightness, clutter, or elements drawing eye away from face. Check for silhouette disruption: any background object (shelf edge, picture frame, plant, architectural element) that intersects or protrudes behind the subject's head — deduct 8–12 and name it. This is particularly distracting when the subject is bald or has a smooth head profile.
25–49: Background dominant over face.
0–24: Background has taken control entirely.
Penalties: horizontal line bisecting face at eye level -8 to -12; vertical split frame -10 to -12; clothing/bg colour clash -5 to -8; wide angle distortion -10 to -15; equipment (microphone stand, boom arm, visible cables) obstructing background elements the subject clearly intended to show -5 to -8.
INTENTIONAL BACKGROUND NOTE: When a background contains curated books, artwork, or professional items that are softly out of focus relative to the face, this is a deliberate compositional choice. Score it in the 70–84 range as a minimum unless a specific penalty applies. Penalise what is genuinely distracting — not what is intentionally present.

FRAMING (0–100):
85–100: Face 50–70% of frame, eyes upper third, shoulders visible, centred.
70–84: Face 40–49% or 71–79%.
45–69: Face below 40% or above 80%, or pushed to edge.
0–44: Face below 30% or framing so poor personality lost at thumbnail.

PRESENCE (0–100):
Eyes visible + lens gaze = 85–100.
Eyes visible + not at lens = 70–84.
Eyes not visible + lens gaze = 50–69.
Eyes not visible + no gaze = 0–49.

STEP 3 — COMMENT AND HINT:
comment: What the camera sees. Direct, specific, slightly dry. One sentence. Never generic. If catchlight issues exist, name them precisely (e.g. "Three catchlights visible in each eye — multiple light sources competing with no clear winner.").
hint: Names the variable to improve. Never solves it. Ends with "is a variable to improve." Even 85+ gets a hint: "To push this further, [variable] is a variable to improve." For glasses glare: mention light angle adjustment and polarizer filter specifically.

STEP 4 — OVERALL: Lighting 25% + Angle 20% + Background 20% + Framing 20% + Presence 15%.

Return ONLY valid JSON, no markdown:
{"overall":<int>,"criteria":{"lighting":{"score":<int>,"comment":"<str>","hint":"<str>"},"angle":{"score":<int>,"comment":"<str>","hint":"<str>"},"background":{"score":<int>,"comment":"<str>","hint":"<str>"},"framing":{"score":<int>,"comment":"<str>","hint":"<str>"},"presence":{"score":<int>,"comment":"<str>","hint":"<str>"}}}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 800,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
          { type: 'text', text: PROMPT }
        ]}]
      })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'API error', detail: err.slice(0,200) });
    }
    const data = await response.json();
    const raw = data.content?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
