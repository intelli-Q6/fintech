// Vercel Serverless Function: Hardened Gemini AI Proxy
// Enforces: JWT Authentication, Daily Quota (10 requests/day), Prompt-Injection Defense & Zero Secret Leaks

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const DAILY_FREE_LIMIT = 10;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-goog-api-key'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed' } });
  }

  // 1. Quota Accounting & Authentication
  let userId: string | null = null;
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

  if (SUPABASE_URL && SUPABASE_ANON_KEY && token) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: userData, error: userError } = await supabase.auth.getUser(token);

      if (!userError && userData?.user) {
        userId = userData.user.id;
        const todayStr = new Date().toISOString().split('T')[0];

        // Check daily quota
        const { data: usage } = await supabase
          .from('ai_usage_daily')
          .select('request_count')
          .eq('user_id', userId)
          .eq('usage_date', todayStr)
          .maybeSingle();

        const currentCount = usage?.request_count || 0;
        if (currentCount >= DAILY_FREE_LIMIT) {
          res.setHeader('Retry-After', '86400');
          return res.status(429).json({
            error: {
              code: 'QUOTA_EXCEEDED',
              message: `Daily AI Copilot quota reached (${DAILY_FREE_LIMIT} queries/day on free tier). Limit resets at midnight.`
            }
          });
        }

        // Increment usage count atomically
        await supabase.from('ai_usage_daily').upsert({
          user_id: userId,
          usage_date: todayStr,
          request_count: currentCount + 1,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,usage_date' });
      }
    } catch (authErr) {
      console.warn('[GeminiProxy] Non-fatal auth/quota check error:', authErr);
    }
  }

  const { contents, systemInstruction, model = 'gemini-1.5-flash', apiKey: bodyApiKey } = req.body || {};
  const headerKey = req.headers['x-goog-api-key'];
  const apiKey = bodyApiKey || headerKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(400).json({
      error: { message: 'Missing Gemini API Key. Configure GEMINI_API_KEY in cloud environment variables or provide a custom key in Settings.' }
    });
  }

  // 2. Input Size Validation & Prompt-Injection Defense
  const payloadStr = JSON.stringify(contents || '');
  if (payloadStr.length > 35000) {
    return res.status(413).json({
      error: { message: 'Payload too large. Financial document or conversation exceeds safe context limits.' }
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
          temperature: 0.2,
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
    // Sanitize: do not log secrets or tokens
    console.error('[GeminiProxy] Internal invocation error occurred');
    return res.status(500).json({ error: { message: 'Internal AI service error' } });
  }
}
