// api/convert-heic.js — converts HEIC/HEIF to JPEG server-side using sharp
import sharp from 'sharp';

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
    const buffer = Buffer.from(imageData, 'base64');
    const jpegBuffer = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
    const base64 = jpegBuffer.toString('base64');
    return res.status(200).json({ imageData: base64, mediaType: 'image/jpeg' });
  } catch (err) {
    console.error('HEIC conversion error:', err);
    return res.status(500).json({ error: 'Conversion failed: ' + err.message });
  }
}
