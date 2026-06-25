import { registerPlugin, Capacitor } from '@capacitor/core';

interface BackgroundLocationPlugin {
  start(options: { apiUrl: string; authToken: string }): Promise<void>;
  stop(): Promise<void>;
}

const BackgroundLocationNative = registerPlugin<BackgroundLocationPlugin>('BackgroundLocation');

export async function startBackgroundTracking(apiUrl: string, authToken: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await BackgroundLocationNative.start({ apiUrl, authToken });
  } catch {}
}

export async function stopBackgroundTracking(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await BackgroundLocationNative.stop();
  } catch {}
}
