// api/analyse-audio.js — scores voice clarity via signal analysis
// Analyses raw PCM audio data sent from the browser Web Audio API.
// No external AI dependency — uses amplitude and SNR heuristics.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { samples, sampleRate } = req.body;
  if (!samples || !Array.isArray(samples)) return res.status(400).json({ error: 'No audio samples' });

  try {
    // samples is a Float32Array-derived plain array of PCM values in [-1, 1]
    const n = samples.length;
    if (n === 0) return res.status(400).json({ error: 'Empty audio' });

    // RMS amplitude — measures overall loudness
    const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / n);

    // Peak amplitude
    const peak = samples.reduce((mx, s) => Math.max(mx, Math.abs(s)), 0);

    // Zero-crossing rate — high ZCR with low amplitude = background noise / silence
    let zcr = 0;
    for (let i = 1; i < n; i++) {
      if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) zcr++;
    }
    const zcrRate = zcr / n;

    // Frame-based SNR estimate:
    // Split into 20ms frames, classify as speech (top 30% by RMS) vs noise (bottom 30%)
    const frameSize = Math.round((sampleRate || 44100) * 0.02);
    const frameCount = Math.floor(n / frameSize);
    const frameRms = [];
    for (let f = 0; f < frameCount; f++) {
      const start = f * frameSize;
      let sum = 0;
      for (let i = start; i < start + frameSize; i++) sum += samples[i] * samples[i];
      frameRms.push(Math.sqrt(sum / frameSize));
    }
    frameRms.sort((a, b) => a - b);
    const noiseFloor = frameRms[Math.floor(frameCount * 0.3)] || 0.001;
    const speechLevel = frameRms[Math.floor(frameCount * 0.7)] || rms;
    const snrDb = 20 * Math.log10((speechLevel + 1e-9) / (noiseFloor + 1e-9));

    // Pass criteria:
    // 1. RMS > 0.01 (audible signal — not whispering or microphone too far)
    // 2. Peak > 0.05 (at least some moments of clear speech)
    // 3. SNR > 6dB (voice meaningfully louder than ambient noise)
    // 4. ZCR not too high relative to amplitude (filters pure noise bursts)
    const loudEnough = rms > 0.01 && peak > 0.05;
    const clearEnough = snrDb > 6;
    const notJustNoise = !(zcrRate > 0.4 && rms < 0.02);

    const pass = loudEnough && clearEnough && notJustNoise;

    return res.status(200).json({ result: pass ? 'pass' : 'fail', debug: { rms: rms.toFixed(4), peak: peak.toFixed(4), snrDb: snrDb.toFixed(1), zcrRate: zcrRate.toFixed(3) } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
