import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.evron.app',
  appName: 'Evron',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    CapacitorUpdater: {
      updateUrl: 'http://35.244.3.148:5193/api/updates/latest',
      statsUrl: '',
      autoUpdate: true,
      resetWhenUpdate: false,
    },
  },
};

export default config;
