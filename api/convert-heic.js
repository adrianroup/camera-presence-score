// api/convert-heic.js — converts HEIC/HEIF to JPEG using heic-convert (pure JS, no native binaries)
import convert from 'heic-convert';

export const config = { api: { bodyParser: { sizeLimit: '30mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageData } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data' });

  try {
    const inputBuffer = Buffer.from(imageData, 'base64');
    const outputBuffer = await convert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.92
    });
    const base64 = Buffer.from(outputBuffer).toString('base64');
    return res.status(200).json({ imageData: base64, mediaType: 'image/jpeg' });
  } catch (err) {
    console.error('HEIC conversion error:', err);
    return res.status(500).json({ error: 'Conversion failed: ' + err.message });
  }
}
