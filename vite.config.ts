import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
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
