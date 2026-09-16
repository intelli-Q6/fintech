// Vercel Serverless Function: AMFI Mutual Fund Data Proxy
// Caches live NAVs and search queries securely on the backend with Edge caching

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { scheme, search } = req.query || {};

  try {
    if (search && typeof search === 'string') {
      const searchUrl = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(search.trim())}`;
      const response = await fetch(searchUrl, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `MF API returned ${response.status}` });
      }
      const data = await response.json();
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(data);
    }

    if (scheme && typeof scheme === 'string') {
      const schemeUrl = `https://api.mfapi.in/mf/${encodeURIComponent(scheme.trim())}`;
      const response = await fetch(schemeUrl, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `MF API returned ${response.status}` });
      }
      const data = await response.json();
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Missing scheme or search parameter' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'AMFI proxy error' });
  }
}
