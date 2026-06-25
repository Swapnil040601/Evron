import { registerPlugin, Capacitor } from '@capacitor/core';

export interface DeviceInfoResult {
  deviceId: string | null;
  wifiSsid: string | null;
  locationEnabled: boolean;
  isDeveloperMode: boolean;
  hasUsagePermission: boolean;
  otherAppOpens: number;
  appOpensDetail: string;
  appTimeline: string;
  isMockLocation: boolean;
  batteryLevel: number;
  chargingStatus: 'charging' | 'discharging' | 'full' | 'not_charging' | 'unknown';
  plugType: 'ac' | 'usb' | 'wireless' | 'none';
  batteryHealth: 'good' | 'overheat' | 'dead' | 'over_voltage' | 'cold' | 'unknown';
  batteryTemp: number;
}

interface DeviceInfoPlugin {
  getInfo(): Promise<DeviceInfoResult>;
  openUsageAccessSettings(): Promise<void>;
  isBatteryOptimized(): Promise<{ optimized: boolean }>;
  requestDisableBatteryOptimization(): Promise<void>;
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
  appTimeline: '[]',
  isMockLocation: false,
  batteryLevel: -1,
  chargingStatus: 'unknown',
  plugType: 'none',
  batteryHealth: 'unknown',
  batteryTemp: 0,
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

export async function isBatteryOptimized(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await DeviceInfoNative.isBatteryOptimized();
    return result.optimized;
  } catch { return false; }
}

export async function requestDisableBatteryOptimization(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await DeviceInfoNative.requestDisableBatteryOptimization();
  } catch {}
}
