import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.evron.aiapp',
  appName: 'Evron AI',
  webDir: 'dist',
  server: {
    url: 'http://34.93.61.112:5193',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
