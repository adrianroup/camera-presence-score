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
DO NOT trigger if: the background contains intentional, curated, identity-reinforcing elements where ALL THREE are true: (1) background is visibly softer in focus than the face with actual bokeh present; (2) elements reinforce professional identity; (3) face is the brightest sharpest element.
A bright warm-coloured wall (orange, yellow) behind a sharp in-focus background does NOT qualify for the intentional exception — it is an uncontrolled bright background.
The test is not "is the background bright?" but "has the background taken control away from the face, and is there genuine intentional composition that justifies it?"

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
CARDINAL RULE — DEFAULT TO NEUTRAL: When in doubt, do not penalise. Only assert a negative finding when you can see it clearly and unmistakably. If you are uncertain, say so honestly in the comment using language like: "It's hard to tell from this screenshot, but you may be experiencing [issue] — worth checking in person." This is always preferable to a confident wrong answer. A score that tells the truth about its uncertainty is more valuable than a confident score that is wrong.

GLASSES NOTE: If subject wears glasses, assess glare carefully and only penalise what you can clearly see.
TIER 1 — SEVERE: Glare unmistakably covers more than 30% of one or both lenses, iris or pupil not readable. Deduct 15–20 points.
TIER 2 — MODERATE: Glare clearly visible across the lens but eye remains readable. Deduct 8–12 points.
TIER 3 — MINOR: Small glare visible only in corner of lens, eye fully readable. Deduct 3–5 points, note only.
UNCERTAIN: If you cannot clearly determine whether glare is present or how significant it is, do not penalise. Say in the comment: "It's hard to tell from this screenshot, but you may be experiencing some glare on the lenses — worth checking in person with someone behind the camera."
For confirmed glare (Tier 1 or 2 only), hint must mention: adjusting the angle of the key light, and using a polarizer filter in front of the camera lens.
DO NOT assume a focus differential exists unless you can actually see soft bokeh on background elements. If you are uncertain whether the background is sharp or defocused, say so: "It's hard to tell from this screenshot whether the background is fully defocused — worth reviewing in a live call." Do not penalise when uncertain.

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
Penalties: horizontal line bisecting face at eye level -8 to -12; vertical split frame -10 to -12; clothing/bg colour clash -5 to -8; wide angle distortion -10 to -15; equipment (microphone stand, boom arm, visible cables) obstructing background elements the subject clearly intended to show -5 to -8; bright warm-coloured wall (orange, yellow, warm white) competing with face brightness -8 to -12.
INTENTIONAL BACKGROUND RULE: A background may be credited as intentional and identity-reinforcing ONLY if ALL THREE of the following are true: (1) background elements are visibly softer in focus than the subject's face — you can see actual bokeh blur on background elements, not just assume it; (2) the background elements clearly reinforce professional identity (the subject's own books, awards, professional equipment); (3) the face remains the brightest and sharpest element in the frame. If focus differential is not visibly present, do not credit the background as intentional. A sharp bookshelf behind a face is not automatically intentional — it must also be subordinate.

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
UNCERTAIN GAZE: Gaze direction is genuinely difficult to assess from a still image. If you cannot clearly determine whether the subject is looking at the lens, do not penalise. Use: "It's hard to tell from this screenshot whether the eyes are directed at the lens — this is worth checking during a live call by positioning your eyes at the level of the camera." Score 80 when uncertain.

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
