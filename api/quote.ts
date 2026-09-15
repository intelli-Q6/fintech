// Vercel Serverless Function: Live Stock & Index Quote Proxy
// Fetches real-time price & candle chart data with Edge CDN caching & CORS

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

  const { ticker, symbol, range = '1mo', interval = '1d' } = req.query || {};
  const rawTarget = ticker || symbol;

  if (!rawTarget || typeof rawTarget !== 'string') {
    return res.status(400).json({ error: 'Missing ticker or symbol query parameter' });
  }

  const targetSymbol = rawTarget.trim();

  try {
    const encoded = encodeURIComponent(targetSymbol);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=${range}&interval=${interval}`;

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Yahoo Finance returned HTTP ${response.status}`,
        ticker: targetSymbol
      });
    }

    const data = await response.json();

    // Cache at Vercel Edge for 15 seconds, serve stale up to 45s while revalidating
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=45');
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Internal proxy error',
      ticker: targetSymbol
    });
  }
}
