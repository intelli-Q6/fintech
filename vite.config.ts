import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/quote': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const ticker = url.searchParams.get('ticker') || url.searchParams.get('symbol') || '';
          const range = url.searchParams.get('range') || '1mo';
          const interval = url.searchParams.get('interval') || '1d';
          return `/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`;
        }
      },
      '/api/search': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const q = url.searchParams.get('q') || '';
          return `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`;
        }
      },
      '/api/yahoo-chart': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        rewrite: (path) => path.replace(/^\/api\/yahoo-chart/, '')
      },
      '/api/yahoo-search': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        rewrite: (path) => path.replace(/^\/api\/yahoo-search/, '')
      }
    }
  }
});
