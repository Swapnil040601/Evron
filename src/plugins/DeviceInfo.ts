import { registerPlugin, Capacitor } from '@capacitor/core';

export interface DeviceInfoResult {
  /** Stable Android device identifier (Settings.Secure.ANDROID_ID) */
  deviceId: string | null;
  wifiSsid: string | null;
  /** True when GPS or network location provider is enabled on the device */
  locationEnabled: boolean;
  isDeveloperMode: boolean;
  hasUsagePermission: boolean;
  /** Total times employee opened a non-Evron app since midnight */
  otherAppOpens: number;
  /** JSON string: { "WhatsApp": 5, "YouTube": 3, ... } */
  appOpensDetail: string;
}

interface DeviceInfoPlugin {
  getInfo(): Promise<DeviceInfoResult>;
  openUsageAccessSettings(): Promise<void>;
}

const DeviceInfoNative = registerPlugin<DeviceInfoPlugin>('DeviceInfo');

const fallback: DeviceInfoResult = {
  deviceId: null,
  wifiSsid: null,
  locationEnabled: true,
  isDeveloperMode: false,
  hasUsagePermission: false,
  otherAppOpens: 0,
  appOpensDetail: '{}',
};

export async function getDeviceInfo(): Promise<DeviceInfoResult> {
  if (!Capacitor.isNativePlatform()) return fallback;
  try {
    return await DeviceInfoNative.getInfo();
  } catch {
    return fallback;
  }
}

export async function openUsageAccessSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await DeviceInfoNative.openUsageAccessSettings();
  } catch {}
}
