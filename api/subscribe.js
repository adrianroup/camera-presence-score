// api/subscribe.js — Vercel serverless function
// Adds a profile to Klaviyo list server-side (keeps private key off the browser)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, first_name, last_name, job_title, linkedin_url } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const KLAVIYO_API_KEY = process.env.KLAVIYO_PRIVATE_API_KEY;
  const LIST_ID = 'UrheH6'; // EBOOK-BUYER

  try {
    // Step 1 — create or update profile
    const profilePayload = {
      data: {
        type: 'profile',
        attributes: {
          email,
          first_name: first_name || '',
          last_name: last_name || '',
          properties: {
            ...(job_title ? { 'Job Title': job_title } : {}),
            ...(linkedin_url ? { 'LinkedIn URL': linkedin_url } : {}),
            'Pre-order Source': 'Website Pre-order Page'
          }
        }
      }
    };

    const profileRes = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`
      },
      body: JSON.stringify(profilePayload)
    });

    const profileData = await profileRes.json();
    let profileId = profileData?.data?.id;

    // 409 = profile already exists — extract ID from the conflict error meta
    if (!profileId && profileRes.status === 409) {
      profileId = profileData?.errors?.[0]?.meta?.duplicate_profile_id;
    }

    if (!profileId) {
      return res.status(500).json({ error: 'Could not create or find profile', detail: JSON.stringify(profileData).slice(0, 200) });
    }

    // Step 2 — add profile to list
    await fetch(`https://a.klaviyo.com/api/lists/${LIST_ID}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`
      },
      body: JSON.stringify({
        data: [{ type: 'profile', id: profileId }]
      })
    });

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
