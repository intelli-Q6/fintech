// Vercel Serverless Function: Gemini API Proxy
// Ensures reliable connectivity bypassing client-side ad-blockers and CORS restrictions

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-goog-api-key'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { contents, systemInstruction, model = 'gemini-1.5-flash', apiKey: bodyApiKey } = req.body || {};
  const headerKey = req.headers['x-goog-api-key'];
  const apiKey = bodyApiKey || headerKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(400).json({
      error: { message: 'Missing Gemini API Key. Provide it in the request or configure VITE_GEMINI_API_KEY in environment variables.' }
    });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          topP: 0.8
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Serverless Gemini Proxy Error:', error);
    return res.status(500).json({ error: { message: error.message || 'Internal Server Error' } });
  }
}
