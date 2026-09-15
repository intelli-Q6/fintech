// Vercel Serverless Function: Live Stock & ETF Registry Search Proxy
// Searches Indian listed equities with Edge CDN caching & CORS

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { q } = req.query || {};
  const query = typeof q === 'string' ? q.trim() : '';

  if (!query) {
    return res.status(200).json({ quotes: [] });
  }

  try {
    const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query
    )}&quotesCount=15&newsCount=0`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Yahoo Finance Search returned HTTP ${response.status}`,
        query
      });
    }

    const data = await response.json();
    // Cache searches for 2 minutes at edge
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Internal search proxy error',
      query
    });
  }
}
