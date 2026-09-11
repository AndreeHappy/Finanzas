import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.finanzas.app',
  appName: 'Finanzas',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
