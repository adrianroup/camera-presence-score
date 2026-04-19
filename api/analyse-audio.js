// api/analyse-audio.js — scores voice clarity via Anthropic

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { audioData, mediaType } = req.body;
  if (!audioData) return res.status(400).json({ error: 'No audio data' });

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
        max_tokens: 100,
        messages: [{ role: 'user', content: [
          { type: 'text', text: `Listen to this audio recording. The person was asked to say "The quick brown fox wouldn't be caught dead using a ring light" twice.

Assess ONLY clarity. Return ONLY one of these two JSON responses with no other text:
{"result": "pass"} — if the voice is clear, audible without strain, sounds human and present, minimal background noise
{"result": "fail"} — if the voice is thin, robotic, sounds processed or distant, background noise competes with voice, or distortion is present

Return ONLY valid JSON.` },
          { type: 'document', source: { type: 'base64', media_type: mediaType || 'audio/webm', data: audioData } }
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
