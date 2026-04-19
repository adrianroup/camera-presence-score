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
Trigger if ANY background element is brighter than the subject's face — windows, illuminated shelving, ceiling lights, bright walls, branded backdrops with bright elements.
The face MUST be the brightest significant element. If not, disqualify.
DO NOT trigger if background is uniformly dark/neutral and clearly darker than face.

If disqualification detected, return ONLY: {"disqualification": "ring_light"} OR {"disqualification": "background_blur"} OR {"disqualification": "bright_background"}
Priority if multiple: ring_light > bright_background > background_blur.

STEP 2 — SCORE FIVE CRITERIA (only if no disqualification):

LIGHTING (0–100): Eyes are the game — sclera visible, iris readable, eye movement detectable.
90–100: Vermeer/Rembrandt — single soft natural catchlight, slight tonal asymmetry, face 1 stop brighter than bg, eyes fully readable.
82–89: Strong natural — single catchlight, eyes clear, good hierarchy.
70–81: Acceptable — eyes visible, flat light, no depth.
55–69: Issues — two dot catchlights (deduct 8–12, name it), or bg competing.
40–54: Significant — eyes difficult to read.
0–39: Severe — eyes hidden or face in shadow.
Penalties: colour cast on skin -10 to -15; low res laptop webcam -15 to -20; eyes too dark caps at 72; two hard dot catchlights -8 to -12.

CAMERA ANGLE (0–100):
85–100: Eye level or just above. Peer, equal, professional.
65–84: Slightly off, not laptop problem.
0–45: Laptop on desk, camera below eye level, nostrils visible. NO partial credit. This is a fail.
Skip 46–64 range entirely.

BACKGROUND (0–100):
85–100: Neutral, darker than face, subordinate, no competing elements.
70–84: Minor issues, not dominant.
50–69: Competing — branded bg, detailed room, slightly bright.
25–49: Background dominant.
0–24: Background has won.
Penalties: horizontal line bisecting face at eye level -8 to -12; vertical split frame -10 to -12; clothing/bg colour clash -5 to -8; wide angle distortion -10 to -15.

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
comment: What the camera sees. Direct, specific, slightly dry. One sentence. Never generic.
hint: Names the variable to improve. Never solves it. Ends with "is a variable to improve." Even 85+ gets a hint: "To push this further, [variable] is a variable to improve."

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
