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
Before doing anything else, look at the background carefully.

PRE-CHECK — REAL BACKGROUND:
Does the background contain ANY of the following: ceiling, ceiling beams, walls, floors, doors, windows, structural columns, bookshelves?
If YES — this is a real background. Skip TEST A, TEST B, TEST C, and TEST D entirely. Do not return a blur disqualification. Proceed directly to STEP 2 scoring.
Only continue to TEST A if the background is a featureless uniform soft mush with none of the above identifiable elements.

TEST A — UNIFORM BLUR (most reliable tell):
Is the background a uniform soft mush — every part of it equally blurred with no depth graduation whatsoever? Real optical blur from a camera lens always graduates: objects closer to the subject are less blurred than objects further away. You can see the falloff. Digital background blur produced by Zoom, Teams, Meet, or similar tools is flat and uniform — everything behind the subject is blurred to the same identical degree regardless of distance. There is no depth falloff. If the background blur appears uniform and flat with no visible depth graduation, this is digital blur.
If YES → return {"disqualification": "background_blur"} immediately. Stop.

TEST B — ANATOMY: EYES (zero tolerance):
Look at the subject's eyes. Ask yourself: can I see BOTH eyes? Are BOTH eyes fully sharp, fully defined, and fully present?
- If the LEFT EYE is missing, partially obscured, soft at its edges, or consumed by background blur in any way → return {"disqualification": "background_blur"} immediately. Stop.
- If the RIGHT EYE is missing, partially obscured, soft at its edges, or consumed by background blur in any way → return {"disqualification": "background_blur"} immediately. Stop.
Do not give partial credit. Do not hedge. If you cannot clearly see both eyes in full, sharp, and complete — disqualify.

TEST C — ANATOMY: EDGES:
Look at the edges of the subject where they meet the background:
- Left ear: sharp and fully present, or soft/dissolved/missing?
- Right ear: same.
- Hairline: sharp, or dissolving into blur?
- Both shoulders: cleanly defined, or being eaten by blur?
- Jawline and neck: clean edge, or melting into background?
If ANY of these are dissolved, softened, or missing → return {"disqualification": "background_blur"} immediately. Stop.
SAFE HARBOUR: If a dark architectural element (ceiling beam, structural column, door frame, exposed brick) sits directly behind the subject's head or shoulders, the apparent softening of edges in that zone is caused by low contrast between the subject and the dark structure — NOT by blur. Do not trigger TEST C for edges that appear soft only because they are adjacent to a dark structural element.

TEST D — EDGE ARTEFACTS:
Are there any unnatural artefacts at the boundary between the subject and the background — colour fringing, halo glow, pixel bleed, a hard mask line, or a green/white outline?
If YES → return {"disqualification": "background_blur"} immediately. Stop.

SAFE HARBOURS — do NOT trigger for these:
- A real room, wall, bookshelf, or artwork that is simply plain, low-contrast, or monochromatic. A plain wall is not blur.
- Real optical lens blur where you can clearly see depth falloff (closer objects less blurred than farther ones) AND subject anatomy is clean and sharp at all edges.
- A room with visible ceiling, ceiling beams, exposed brick, dark structural elements, or architectural features. Dark beams or structural elements behind the subject's head do NOT indicate blur — they are real room architecture. Only disqualify if the background is a uniform soft mush with no visible structure.
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
BEFORE SCORING: Answer these two questions about the image.
1. Can you see the subject's nostrils from below, or does the chin and neck dominate the lower frame? → YES = LOW ANGLE FAIL → score 0–45 immediately.
2. Are the subject's eyes angled sharply downward, or is the top of their head filling the upper frame? → YES = HIGH ANGLE FAIL → score 0–45 immediately.
If either answer is YES, do not proceed to the scale below. Score 0–45 and move on.

The camera should be at eye level or fractionally above. The test is simple: where is the camera relative to the eyes?

90–100: Camera is at or near eye level. The lens appears level with the subject's eyes — the viewer feels like a peer. No obvious upward or downward tilt detectable. This is the DEFAULT score when the angle looks natural and comfortable. If you cannot clearly see a problem, score 90–100.
70–89: Deviation is clearly visible and specific — camera is noticeably low (chin clearly raised, nostrils starting to show) or noticeably high (subject clearly looking slightly downward at camera). Only score here if you can name the specific deviation you see.
0–45: Camera clearly below eye level — nostrils visible, chin prominent, ceiling in shot. OR camera clearly above eye level — top of head dominant, face compressed downward. Both are fails. Score MUST be 45 or below.
Skip 46–69 entirely.
When in doubt between 90–100 and 70–89, always choose 90–100. Reserve amber for cases where the deviation is unmistakable and you can describe it specifically.

LOW ANGLE — MANDATORY FAIL TRIGGERS (score 0–45, no exceptions):
- Ceiling visible above the subject's head and occupying more than 20% of the total frame height
- Chin and neck dominating lower half of frame
- Subject appears to be looking downward toward camera
OVERRIDE NOTE: The cardinal rule ("when in doubt, do not penalise") does NOT apply to these mandatory fail triggers. CEILING TEST: Look at the top edge of the frame. Is the ceiling (the room's upper surface, not the background wall) visible? If yes, estimate what fraction of the total frame height is ceiling. If the ceiling occupies more than 1/5 of the frame height from the top — meaning the ceiling-to-wall junction is below the top 20% of the frame — score 0–45 immediately. In Zoom and video call screenshots, any substantial ceiling visibility almost always means the camera is too low. Do not give partial credit.

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

CHECK THIS FIRST — DIGITAL BLUR ANATOMY FAIL (score 0–39, no exceptions):
Before scoring anything else: look at the subject's face edges, hairline, ears, and shoulders. Check each of these specifically:
- Is either eye fully sharp and clearly defined at its outer edge? If one eye is soft, dissolved, or fading where it meets the background blur — even partially — that is a fail.
- Are both ears sharp where they meet the background? A dissolved or missing ear is a fail.
- Is the hairline sharp? Hair strands dissolving into blur is a fail.
- Are both shoulders sharp where they meet the background? A shoulder being eaten by blur is a fail.
If ANY of the above are present — even partially, even on just one side — that is a digital background blur mask failure. Score 0–39 and name the specific anatomy being consumed. You are not permitted to score higher than 39 if any anatomy is being dissolved. A blurred background that eats the subject is always worse than an honest busy background.
NOTE: Dark architectural elements (ceiling beams, structural columns) behind the subject do NOT count as blur anatomy failures — low contrast against a dark structure is not the same as being dissolved by blur. Only trigger this check for genuine uniform software blur.

WHAT MAKES A BACKGROUND COMPETE:
The eye goes where brightness and edge contrast lead it. A background competes when it matches or rivals the face on EITHER of these two axes:
- LUMINANCE PARITY: Background elements are similar in brightness to the face — same exposure zone or brighter. A warm orange wall, a white shelf unit, a bright window. These do not recede.
- SHARP EDGES: Background elements carry hard, high-contrast edges at similar sharpness to the face — readable text, distinct object boundaries, framed pictures with crisp frames, grid-like shelving.
BOTH factors together = strong competition. Either one alone = partial competition.

WHAT DOES NOT COMPETE:
- Elements that are measurably darker than the face recede naturally. Dark and tonal = subordinate. This is chiaroscuro — intentional tonal separation that makes the face pop forward. Do NOT penalise it.
- Elements that are soft, out of focus, or low in contrast recede even at moderate brightness.
- A plain wall — even mid-grey — does not compete if it is darker than the face. Neutral, darker, plain = green.
- A dark chair, dark wall texture, or any dark element behind the face that is clearly subordinate in luminance is professional and correct. Subordinate = not competing.

MANDATORY GREEN ANCHOR — score 75 or above if ALL of the following are true:
(1) The background is a plain or near-plain wall with no readable text, no framed objects, no shelving, no windows, and no bright warm colours.
(2) The background is darker than the face by all three of these luminance tests:
    PRIMARY: The darkest visible wall pixel is darker than the brightest face highlight pixel (forehead, cheekbone, bridge of nose). If the wall's darkest point cannot beat the face's brightest point, the background is subordinate.
    SECONDARY A: The background mean luminance is darker than the face highlight zone mean (forehead + cheekbones region).
    SECONDARY B: The background's brightest pixel does not exceed the face highlight p90 — i.e. no single wall pixel is brighter than the top 10% of face highlights.
    If all three tests pass, the background is fully subordinate. If the PRIMARY test passes but one secondary fails, still score green but at the lower end (75–78). If the PRIMARY test fails — meaning the wall's darkest point is brighter than the face's brightest highlight — the background is not subordinate and cannot score green.
(3) The background is not so dark that the subject appears to float in a black void — some wall texture or tonal detail is still visible. A completely crushed black background with no detail is a "floating head" effect and scores 50–65, not green.
(4) Any furniture visible (chair backs, headrests) is dark and tonally merges with the background rather than contrasting against it.
If all four are true, the background is doing its job. Score 75–89. A dark office chair visible behind a normally lit subject on a plain wall is the textbook correct Zoom setup. It is not a penalty.

90–100: Background clearly subordinate. Darker, softer, or plain. Face unmistakably the focal point.
75–89: Minor issues — slightly busy or slightly close in luminance, but face still holds primary attention.
50–74: Background competes — elements similar in brightness to face OR carrying sharp high-contrast edges that draw the eye. Score MUST be 74 or below if background has both luminance parity AND sharp edges simultaneously.
25–49: Background dominant — eye drawn away from subject more than toward them. Bright AND busy AND sharp.
0–24: Background has taken control entirely.

CEILING DOMINANCE — score MUST be 49 or below if ceiling occupies more than 20% of the frame height. A ceiling-dominated background means the camera is too low and the room's architecture is competing with the subject's face. This is always a red background.

HARD RED TRIGGERS — score MUST be 49 or below, no exceptions:
- GALLERY WALL / ART WALL: A chaotic or overwhelming collection of framed pictures, artwork, or photographs covering most of the wall behind the subject — so many that the eye is drawn away from the face. Score 35–49. DO NOT apply this trigger for a modest arrangement of 2–6 framed pictures that is clearly decorative and intentional — that is amber territory (50–64), not a hard red fail.
- KITCHEN: Cabinets, appliances, countertops, or food visible. The setting undermines any professional context. Score 30–44.
- BEDROOM: Bed, headboard, pillows, or bedroom furniture visible. Score 30–44.
- CAR INTERIOR: Dashboard, seats, windows, or car interior visible. Score 25–39.
These are environmental fails. The setting is the message. You are not permitted to score above 49 when any of these are clearly present.

AMBER TERRITORY — score 50–69, not a fail:
- BUSY BOOKSHELF: Books, objects, and varied colours clearly visible and sharp on shelves behind the subject. A bookshelf is a recognised professional and intellectual backdrop. It competes visually but does not disqualify. Score 50–64. Only drop below 50 if the shelves are chaotic enough that the eye is pulled away from the face more than toward it — not merely because the shelves are colourful or full.
- HIGH VISUAL COMPLEXITY: 5+ distinct objects clearly visible but background is a real room and face remains primary. Score 50–64.

INTENTIONAL BACKGROUND RULE: A background may be credited as intentional ONLY if ALL THREE are true:
(1) Background elements are visibly softer in focus than the face — actual bokeh present, not assumed
(2) Elements reinforce professional identity (subject's own books, awards, professional equipment)
(3) Face remains the brightest and sharpest element in the frame, clearly dominant
A sharp busy bookshelf is NOT intentional. It must be soft AND subordinate. When in doubt, it is not intentional.

SILHOUETTE DISRUPTION: Any object (shelf edge, picture frame, plant, door frame) that intersects or protrudes directly behind the subject's head. Particularly distracting on bald subjects. Deduct 10–15 and name it specifically.

Additional penalties (stack onto base score): horizontal line bisecting face at eye level -10 to -15; vertical split frame -10 to -12; wide angle distortion -10 to -15; bright warm-coloured wall competing with face -8 to -12; visible cables or equipment cluttering frame -5 to -8.

─── FRAMING (0–100) ───
BEFORE SCORING: Answer these two questions first.
1. Is any part of the subject's face cut off by the frame edge — forehead, chin, ears, or sides of the face? → YES = FACE CUT OFF FAIL → score framing 0–44 immediately. Also score angle 0–45 and presence 0–49. Do not proceed to the scale below for any of these three criteria.
2. Is the subject's face small in the frame — would their facial expression be unreadable at thumbnail size? Measure face height (top of forehead to chin tip) as a percentage of the total image height. NOTE: ignore any name bar, watermark, or UI overlay at the bottom of the frame — measure only the photographic image area. If face height is less than 15% of image height → YES = TOO FAR FAIL → score framing 0–44 immediately. Do not proceed to the scale below. A face that clearly fills 40–70% of the vertical frame is NOT too far, regardless of aspect ratio or how wide the image is.

If either answer is YES, stop and score accordingly.

ASPECT RATIO NOTE: Many submissions are wide 16:9 landscape frames (Zoom, Teams, webcam). On a wide frame, the face naturally occupies less of the total pixel area — this is correct and expected. Judge framing by face HEIGHT vs frame HEIGHT only, not by how much horizontal space surrounds the face. A subject whose face fills 40–70% of the vertical height with shoulders visible is correctly framed on any aspect ratio. Wide horizontal space left and right is not a framing problem.

90–100: Face height 40–70% of frame height. Eyes in upper half. Shoulders visible. Subject centred.
72–89: Face height 30–39% or 71–79% of frame. Minor adjustment would help but not a fail.
45–71: Face height below 25% (too far) or above 80% (too close). Or pushed to edge of frame.
0–44: Face height below 15%, or framing so poor personality is lost at thumbnail size.

TOO CLOSE (Home Alone): Face fills most of the frame, forehead cut off, chin at bottom edge, no shoulders visible, camera is uncomfortably close. This is a FACE CUT OFF FAIL — score framing 0–44, angle 0–45, presence 0–49.
TOO FAR (Lawrence of Arabia): Subject is small in the frame, surrounded by empty room, face unreadable at thumbnail. This is a TOO FAR FAIL — score framing 0–44.
OFF-CENTRE: Subject pushed significantly to one side with empty space on the other. Name it.

─── PRESENCE (0–100) ───
PRESENCE IS ABOUT GAZE AND EYE VISIBILITY ONLY. Do not factor in framing, background, or other criteria. Score independently.

90–100: Eyes clearly visible and directed at the camera lens. The subject is here, present, looking at us.
72–89: Eyes visible but gaze not clearly directed at lens — looking at their own image, at notes, at another screen.
50–71: Eyes visible but gaze direction genuinely unclear in this still frame.
0–49: Eyes not visible, or face turned away, or subject clearly looking away from lens.

UNCERTAIN GAZE: A still image makes gaze direction genuinely hard to call. If eyes are clearly visible and forward-facing, default to green — minimum score 78. Only score below 72 if you can specifically name what the gaze is directed at instead of the lens. "Uncertain" is not a reason to penalise — uncertainty defaults up, not down. You are not permitted to score below 78 when both eyes are clearly visible and facing forward, unless you can name a specific off-axis target.
NOT LOOKING AT CAMERA: If the subject is clearly looking at their own image on screen rather than the lens, name it. The fix is to look at the camera dot, not the screen.
FACE TURNED: If we are seeing the side of someone's head, they are not present for this call. Score accordingly.
ANGLE EXCEPTION: If the subject is looking downward because the camera is positioned below their eye level (a low camera angle problem), this is NOT a presence failure — it is an angle failure. The subject is still directing their gaze toward the camera. If both eyes are visible and facing the lens, score presence 72 or above regardless of vertical gaze direction.

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
        model: 'claude-sonnet-4-5',
        temperature: 0,
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
