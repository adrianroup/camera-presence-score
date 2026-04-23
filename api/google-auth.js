// api/google-auth.js — Vercel serverless function
// Handles Google OAuth token exchange server-side.
// Client Secret lives ONLY in a Vercel environment variable — never in the browser.
//
// Required Vercel env vars:
//   GOOGLE_CLIENT_ID     (set in Vercel dashboard)
//   GOOGLE_CLIENT_SECRET (set in Vercel dashboard)
//   GOOGLE_REDIRECT_URI  = https://test.anaudiencefromanywhere.com/auth/google/callback

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing code parameter' });

  const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  || 'https://test.anaudiencefromanywhere.com/auth/google/callback';

  if (!CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID env var is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!CLIENT_SECRET) {
    console.error('GOOGLE_CLIENT_SECRET env var is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // ── Step 1: Exchange code for access token ──────────────────────────────
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Google token error:', errText);
      return res.status(400).json({ error: 'Token exchange failed', detail: errText.slice(0, 200) });
    }

    const { access_token } = await tokenRes.json();
    if (!access_token) return res.status(400).json({ error: 'No access token returned' });

    // ── Step 2: Fetch user info ─────────────────────────────────────────────
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error('Google userinfo error:', errText);
      return res.status(400).json({ error: 'Profile fetch failed', detail: errText.slice(0, 200) });
    }

    const profile = await profileRes.json();
    return res.status(200).json({
      sub:       profile.id          || '',
      firstName: profile.given_name  || '',
      lastName:  profile.family_name || '',
      email:     profile.email       || '',
      picture:   profile.picture     || '',
    });

  } catch (err) {
    console.error('google-auth error:', err);
    return res.status(500).json({ error: err.message });
  }
}
