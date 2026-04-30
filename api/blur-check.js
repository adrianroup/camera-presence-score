// api/blur-check.js — Vercel serverless function
// Focused binary blur detection using GPT-4o Vision.
// Returns { blur: true } or { blur: false }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageData, mediaType } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data' });

  const PROMPT = `Look at the background of this image — the area behind the person.

Answer ONE question only: Is the background digitally blurred by software such as Zoom, Teams, or Google Meet?

How to tell:
- Digital blur is UNIFORM — every part of the background is equally soft, with no depth graduation. Objects close to the person are just as blurred as objects far away.
- Real rooms and optical lens blur always show DEPTH GRADUATION — objects closer to the person are sharper than objects further away.
- Digital blur often dissolves the edges of the person — ears, hairline, shoulders become soft or partially missing where they meet the background.
- Real backgrounds have visible texture and hard edges even if plain or low-contrast.

If the background blur is uniform flat mush with no depth graduation — answer YES.
If the background is a real room, real wall, or real optical blur with visible depth falloff — answer NO.

Reply with ONLY the single word YES or NO. Nothing else.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 10,
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
    const blur = raw.startsWith('YES');
    console.log('[BlurCheck] GPT-4o response:', raw, '→', blur ? 'BLUR' : 'CLEAN');
    return res.status(200).json({ blur });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
