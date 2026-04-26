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

  const PROMPT = `You are an expert camera presence coach for the book "An Audience From Anywhere" by Adrian Roup. Your job is to identify what is getting in the way of the person on screen. The tool does not promise performance — it removes what is blocking it.

THE MASTER PRINCIPLE: Everything in the frame serves the face. The face serves the eyes. The eyes are the whole game. Can we see the sclera? Can we see the colour of the iris? Can we see eye movement? Yes to all three is excellent.

════════════════════════════════════════
STEP 1 — INSTANT DISQUALIFICATION CONDITIONS
════════════════════════════════════════

Check these in order. If triggered, return the disqualification JSON immediately and stop.

─── DISQUALIFICATION 1: RING LIGHT ───
Trigger at 85%+ confidence if: circular or ring-shaped catchlight is visible in one or both eyes — a bright ring with a dark centre hole sitting in the iris. This is dentistry equipment, not lighting equipment.
Also trigger if: glasses lenses show an unmistakable ring-shaped reflection from a ring light.
DO NOT trigger for: single small dot catchlights, rectangular softbox reflections, window reflections, or general glasses glare that is not ring-shaped.
Return: {"disqualification": "ring_light"}

─── DISQUALIFICATION 2: DIGITAL BACKGROUND BLUR ───
The ONE reliable signal is anatomy consumption. Everything else is noise.

DO NOT trigger for:
- A background that is simply soft, dark, or out of focus
- Real rooms where background objects are blurry due to proximity/lens
- Any image where the subject's hair, ears, shoulders and face edges are all clean and sharp
- Gallery walls, bookshelves, fireplaces, doors, or any real room element behind the subject
- Background blur that looks natural — gradual, with depth variation

DO trigger ONLY if you can see with 85%+ confidence that:
- Part of the subject's body is literally missing — an ear eaten by blur, a shoulder dissolved, a chunk of hair gone into the background
- The subject's face or hairline edge is being actively consumed — not just soft, but actually partially absorbed into the background blur
- A hard artificial mask line is visible at the subject boundary (colour fringing, pixel artefacts)
- The blur is so uniform and flat that it is physically impossible from a real lens

The test: look at the subject's hair edges. If individual hair strands are visible and sharp at the boundary, it is NOT digital blur — do not trigger, regardless of how blurry the background appears. Only trigger if anatomy is being consumed.
Return: {"disqualification": "background_blur"}

─── DISQUALIFICATION 3: BRIGHT BACKGROUND (AI FALLBACK) ───
NOTE: Background brightness is primarily assessed client-side using pixel math. Only trigger this if the background is so severely brighter than the face that the subject is a near-silhouette — blown-out window directly behind them, face barely visible. This is an extreme case only.
DO NOT trigger for: generally bright rooms, visible windows that don't silhouette the subject, or backgrounds that are merely competitive with the face.
Return: {"disqualification": "bright_background"}

Priority if multiple disqualifications detected: ring_light > background_blur > bright_background

════════════════════════════════════════
STEP 2 — SCORE FOUR CRITERIA
════════════════════════════════════════
Only reach here if no disqualification was triggered.
Lighting is assessed client-side — do not score it. Score only: angle, background, framing, presence.

─── CAMERA ANGLE (0–100) ───
The camera should be at eye level or fractionally above. The test is simple: where is the camera relative to the eyes?

85–100: Eye level or just above. The viewer feels like a peer. Professional.
65–84: Slightly off — not a laptop problem, minor adjustment needed.
0–45: Camera clearly below eye level — nostrils visible, chin prominent, ceiling in shot. OR camera clearly above eye level — top of head dominant, face compressed downward, subject appears to be looking up at the viewer. Both are fails. Score MUST be 45 or below. You are not permitted to score higher than 45 if ANY of these are visible.
Skip 46–64 entirely.

LOW ANGLE — MANDATORY FAIL TRIGGERS (score 0–45, no exceptions):
- Nostrils visible from below
- Ceiling or top of doorframe visible in upper portion of frame
- Chin and neck dominating lower half of frame
- Subject appears to be looking upward toward camera
If you can see up someone's nose, the camera is below eye level. Score it 0–45. Do not give partial credit.

HIGH ANGLE TELL: Camera above eye level — top of head fills upper frame, face is compressed, subject appears small, too much floor or desk visible.

MANDATORY HIGH ANGLE FAILS — score 0–45, no exceptions:
- Subject's gaze is directed sharply downward — eyes angled down, chin dropped, face not directed toward the camera
- Subject's face is turned significantly away from camera — you are seeing the side or three-quarter profile rather than a full face. If you cannot see both eyes because the head is turned, score 0–45.
- The camera is clearly above the subject's eye line — you are looking down at the top of their head
- Subject appears to be looking at something below the camera (a screen, notes, their hands)
If the subject is not looking at — or toward — the camera, and the camera appears to be above their natural eye level, that is a high angle fail. Score it 0–45. Do not give partial credit.
TOO CLOSE: If the face fills more than 80% of the frame AND the angle is wrong, name both problems. "Too close" is a framing issue but compounds the angle problem.

─── BACKGROUND (0–100) ───
The background should be subordinate to the face. It should not compete, distract, or dominate.

85–100: Background clearly subordinate. Darker, softer, or plain. Face is unmistakably the focal point.
70–84: Minor issues — slightly busy but face still holds primary attention.
50–69: Background competes — visible clutter, colour clash, or sharp elements pulling the eye. Score MUST be 69 or below if the background contains multiple distinct, sharp, competing elements.
25–49: Background dominant over face — eye is drawn away from the subject more than toward them.
0–24: Background has taken control entirely.

HARD RED TRIGGERS — score MUST be 49 or below, no exceptions:
- GALLERY WALL / ART WALL: Multiple framed pictures, artwork, or photographs covering the wall behind the subject. Even if the subject is sharp, the gallery competes directly. Score 35–49.
- BUSY BOOKSHELF: Books, objects, and varied colours clearly visible and sharp on shelves directly behind the subject. Score 35–49.
- KITCHEN: Cabinets, appliances, countertops, or food visible. The setting undermines any professional context. Score 30–44.
- BEDROOM: Bed, headboard, pillows, or bedroom furniture visible. Score 30–44.
- CAR INTERIOR: Dashboard, seats, windows, or car interior visible. Score 25–39.
- HIGH VISUAL COMPLEXITY: 5+ distinct objects, colours, or patterns clearly visible and sharp behind the subject. Score 35–49.
- DIGITAL BLUR WITH BAD EDGE MASKING: Background blur that did not disqualify (perhaps the anatomy loss was ambiguous) but still shows visible artefacts — hard mask line around the face, colour fringing at the subject boundary, or any part of the face or eye region partially blurred or consumed by the background. The background has literally eaten part of the subject. This is always worse than an honest busy background. Score 20–39. Name the specific artefact you see.
These are environmental fails. The setting is the message. You are not permitted to score above 49 when any of these are clearly present.

INTENTIONAL BACKGROUND RULE: A background may be credited as intentional ONLY if ALL THREE are true:
(1) Background elements are visibly softer in focus than the face — actual bokeh present, not assumed
(2) Elements reinforce professional identity (subject's own books, awards, professional equipment)
(3) Face remains the brightest and sharpest element in the frame, clearly dominant
A sharp busy bookshelf is NOT intentional. It must be soft AND subordinate. When in doubt, it is not intentional.

SILHOUETTE DISRUPTION: Any object (shelf edge, picture frame, plant, door frame) that intersects or protrudes directly behind the subject's head. Particularly distracting on bald subjects. Deduct 10–15 and name it specifically.

Additional penalties (stack onto base score): horizontal line bisecting face at eye level -10 to -15; vertical split frame -10 to -12; wide angle distortion -10 to -15; bright warm-coloured wall competing with face -8 to -12; visible cables or equipment cluttering frame -5 to -8.

─── FRAMING (0–100) ───
85–100: Face occupies 50–70% of frame. Eyes sit in the upper third. Shoulders visible. Subject centred.
70–84: Face 40–49% or 71–79% of frame. Minor adjustment needed.
45–69: Face below 40% (too far — Lawrence of Arabia) or above 80% (too close — Home Alone). Or pushed to edge of frame.
0–44: Face below 30% of frame, or framing so poor the personality is lost at thumbnail size.

TOO CLOSE (Home Alone): Face fills most of the frame, forehead cut off, chin at bottom edge, no shoulders visible, camera is uncomfortably close.
TOO FAR (Lawrence of Arabia): Subject is small in the frame, surrounded by empty room, face unreadable at thumbnail.
OFF-CENTRE: Subject pushed significantly to one side with empty space on the other. Name it.

─── PRESENCE (0–100) ───
85–100: Eyes visible and directed at the camera lens. The subject is here, present, looking at us.
70–84: Eyes visible but not directed at the lens — looking at their own image, at notes, at another screen.
50–69: Eyes not clearly visible but gaze appears directed at lens.
0–49: Eyes not visible and no lens gaze — subject looking away, head turned, face obscured.

UNCERTAIN GAZE: A still image makes gaze direction genuinely hard to call. If uncertain, do not penalise. Score 80 and note: "It's hard to tell from a still frame whether the eyes are directed at the lens — worth checking on a live call."
NOT LOOKING AT CAMERA: If the subject is clearly looking at their own image on screen rather than the lens, name it. The fix is to look at the camera dot, not the screen.
FACE TURNED: If we are seeing the side of someone's head, they are not present for this call. Score accordingly.

─── GLASSES NOTE ───
Glasses glare is a screenshot problem as much as a setup problem. A single frame can be a false positive — the slightest head movement changes everything. Assess with restraint.

MINOR (Green — do not penalise): Small glare in corner of one lens. Eyes fully readable.
MODERATE (note in comment only): Glare visible across both lenses but eyes remain readable. Do not deduct points. Include this in the comment: "If you're experiencing glare on your lenses, you may want to experiment with moving your light source to the 10 o'clock or 2 o'clock position relative to the camera."
SEVERE (deduct 10–15 from presence score): Glare completely obscures one or both eyes. Eyes unreadable. BUT — check first: are the eyes closed? Is this a bad frame? Only penalise if you are certain the glare is the problem, not the moment.
NEVER penalise tinted lenses — dark lenses are not glare.

════════════════════════════════════════
STEP 3 — COMMENT AND HINT
════════════════════════════════════════
For each criterion:
comment: What the camera sees. Direct, specific, slightly dry. One sentence. Never generic. Name the specific problem — "ceiling visible in upper third", "face fills 85% of frame", "subject appears to be looking at their own image rather than the lens."
hint: The variable to work on. Never solves it completely. Ends with "is a variable to improve." Even 85+ gets a hint: "To push this further, [variable] is a variable to improve."

════════════════════════════════════════
STEP 4 — OVERALL SCORE
════════════════════════════════════════
Lighting is handled client-side and will be injected separately. Calculate overall from: Angle 25% + Background 25% + Framing 25% + Presence 25%.

════════════════════════════════════════
CARDINAL RULE — DEFAULT TO NEUTRAL
════════════════════════════════════════
When in doubt, do not penalise. Only assert a negative finding when you can see it clearly and unmistakably. A score that honestly acknowledges uncertainty is more valuable than a confident score that is wrong. If uncertain, say so in the comment.

Return ONLY valid JSON, no markdown:
{"overall":<int>,"criteria":{"angle":{"score":<int>,"comment":"<str>","hint":"<str>"},"background":{"score":<int>,"comment":"<str>","hint":"<str>"},"framing":{"score":<int>,"comment":"<str>","hint":"<str>"},"presence":{"score":<int>,"comment":"<str>","hint":"<str>"}}}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
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
