// api/blur-check.js — Vercel serverless function
// Blur detection + glasses eye obstruction check using GPT-4o Vision.
// Returns { blur: true|false, eyeObstruction: 'none'|'partial'|'full' }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageData, mediaType } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data' });

  const PROMPT = `Analyse this image and answer TWO questions. Reply with EXACTLY two lines, nothing else.

QUESTION 1 — BACKGROUND BLUR:
Is the background digitally blurred by software such as Zoom, Teams, or Google Meet?
- Digital blur is UNIFORM — every part of the background is equally soft, with no depth graduation.
- Real rooms and optical lens blur show DEPTH GRADUATION — objects closer to the person are sharper than objects far away.
- Digital blur often dissolves the edges of the person — ears, hairline, shoulders become soft or partially missing.
- A plain flat wall, painted surface, or solid colour backdrop is NOT blur — it is a real background with no texture. Answer NO for plain walls.
- A room with ceiling beams, exposed brick, architectural features, or visible room structure is a REAL background — not blur. Answer NO if you can see any walls, ceiling, floors, furniture, doors, windows, or architectural features, even if partially out of focus.
- A bright window or overexposed background is NOT blur — it is a lighting problem. Answer NO.
- Only answer YES if you can see the characteristic uniform software blur mush with dissolved edges.

QUESTION 2 — EYE OBSTRUCTION:
Can you clearly see both of the person's eyes through their glasses (if wearing any)?
- NONE: No glasses, OR glasses present with both eyes clearly visible through the lenses (no reflections blocking the eyes).
- PARTIAL: Glasses are present AND one or both eyes are partially obscured by lens reflections or glare — you can see the eyes but they are degraded.
- FULL: Glasses are present AND one or both eyes are completely hidden behind bright reflections — the eyes are not visible at all.
If no glasses are visible, answer NONE.

Reply with EXACTLY this format (two lines, no other text):
BLUR: YES
EYES: NONE`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        max_tokens: 15,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mediaType || 'image/jpeg'};base64,${imageData}`, detail: 'low' } },
            { type: 'text', text: PROMPT }
          ]
        }]
      })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'OpenAI API error', detail: err.slice(0, 200) });
    }
    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();
    // Parse BLUR line
    const blurMatch = raw.match(/BLUR:\s*(YES|NO)/);
    const blur = blurMatch ? blurMatch[1] === 'YES' : raw.startsWith('YES');
    // Parse EYES line
    const eyesMatch = raw.match(/EYES:\s*(NONE|PARTIAL|FULL)/);
    const eyeObstruction = eyesMatch ? eyesMatch[1].toLowerCase() : 'none';
    console.log('[BlurCheck] GPT-4o blur:', blur ? 'YES' : 'NO', '| eyes:', eyeObstruction);
    return res.status(200).json({ blur, eyeObstruction });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
