import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.qlsv2',
  appName: 'QLSV2 Learning Studio',
  webDir: 'dist',
  server: {
    url: 'https://your-vercel-app.vercel.app',
    cleartext: false
  }
};

export default config;
