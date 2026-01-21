import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            ws: true,
            timeout: 60000,
            proxyTimeout: 60000
          },
          '/preview': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            timeout: 60000,
            proxyTimeout: 60000
          },
          '/ingest': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            timeout: 60000,
            proxyTimeout: 60000
          },
          '/tts': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            timeout: 60000,
            proxyTimeout: 60000
          },
          '/hydrate': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            timeout: 60000,
            proxyTimeout: 60000
          },
          '/generate-image': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            timeout: 60000,
            proxyTimeout: 60000
          },
          '/audio': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            timeout: 60000,
            proxyTimeout: 60000
          },
          '/slides': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            timeout: 90000,
            proxyTimeout: 90000
          },
          '/infographic': {
            target: 'http://localhost:5000',
            changeOrigin: true,
            timeout: 30000,
            proxyTimeout: 30000
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
