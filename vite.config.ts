import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        host: "localhost",
        port: 3002,
        strictPort: true,
        hmr: {
          protocol: "ws",
          host: "localhost",
          port: 3002,
        },
        proxy: {
          "/api": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/preview": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/ingest": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/report": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/podcast": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/infographic": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/slides": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/tts": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/audio": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/hydrate": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/generate-image": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/image": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/exports": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
          "/storage": {
            target: "http://localhost:5000",
            changeOrigin: true,
          },
        },
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
