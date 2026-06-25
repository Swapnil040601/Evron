import { registerPlugin, Capacitor } from '@capacitor/core';

interface PushNotificationPlugin {
  getToken(): Promise<{ token: string }>;
}

const PushNotificationNative = registerPlugin<PushNotificationPlugin>('PushNotification');

export async function getFcmToken(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const result = await PushNotificationNative.getToken();
    return result.token;
  } catch {
    return null;
  }
}
