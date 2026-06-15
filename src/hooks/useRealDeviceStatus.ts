import { useEffect, useState, useRef, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { Network } from '@capacitor/network';
import { apiService } from '../services/api';

export interface RealDeviceStatus {
  gpsEnabled: boolean;
  permissionDenied: boolean;
  isOnline: boolean;
  latitude: number;
  longitude: number;
  checking: boolean;
}

const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

export function useRealDeviceStatus(employeeName?: string): RealDeviceStatus {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [latitude, setLatitude] = useState(DEFAULT_LAT);
  const [longitude, setLongitude] = useState(DEFAULT_LNG);
  const [checking, setChecking] = useState(true);

  const prevGpsRef = useRef<boolean | null>(null);
  const prevOnlineRef = useRef<boolean | null>(null);

  const raiseAlert = async (message: string, type: 'critical' | 'warning' | 'info') => {
    try {
      await apiService.addSimulatorAlert(message, type);
    } catch {}
  };

  const checkGps = useCallback(async () => {
    try {
      let perm = await Geolocation.checkPermissions();

      if (perm.location === 'prompt' || perm.location === 'prompt-with-rationale') {
        const req = await Geolocation.requestPermissions({ permissions: ['location'] });
        perm = req;
      }

      if (perm.location === 'denied') {
        setPermissionDenied(true);
        setGpsEnabled(false);
        if (prevGpsRef.current !== false) {
          prevGpsRef.current = false;
          const name = employeeName || 'Employee';
          await raiseAlert(
            `🚨 GPS COMPLIANCE ALERT: ${name}'s device location permission has been DENIED. Attendance check-in is blocked. Admin review required.`,
            'critical'
          );
        }
        return;
      }

      const pos = await Geolocation.getCurrentPosition({
        timeout: 10000,
        enableHighAccuracy: true,
      });

      setGpsEnabled(true);
      setPermissionDenied(false);
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);

      if (prevGpsRef.current === false) {
        prevGpsRef.current = true;
        const name = employeeName || 'Employee';
        await raiseAlert(`✅ GPS RESTORED: ${name}'s device location is now active.`, 'info');
      } else {
        prevGpsRef.current = true;
      }
    } catch (err: any) {
      setGpsEnabled(false);
      const wasOn = prevGpsRef.current;
      prevGpsRef.current = false;

      if (wasOn !== false) {
        const name = employeeName || 'Employee';
        const reason =
          err?.code === 1
            ? 'Location permission denied.'
            : err?.code === 2
            ? 'Device GPS / Location services are OFF.'
            : 'Location unavailable.';
        await raiseAlert(
          `🚨 GPS DISABLED: ${name} — ${reason} Attendance check-in is now BLOCKED. Immediate compliance review required.`,
          'critical'
        );
      }
    }
  }, [employeeName]);

  useEffect(() => {
    let networkListener: any;
    let gpsInterval: ReturnType<typeof setInterval>;

    const init = async () => {
      setChecking(true);

      // ── Internet ──────────────────────────────────────────────────────────
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        prevOnlineRef.current = status.connected;
      } catch {}

      networkListener = await Network.addListener('networkStatusChange', async (status) => {
        const wasOnline = prevOnlineRef.current;
        setIsOnline(status.connected);
        prevOnlineRef.current = status.connected;

        if (wasOnline && !status.connected) {
          const name = employeeName || 'Employee';
          const event = {
            message: `⚠️ CONNECTIVITY LOST: ${name}'s device went OFFLINE at ${new Date().toLocaleTimeString()}. Attendance monitoring interrupted.`,
            type: 'critical',
            time: new Date().toISOString(),
          };
          const queue: any[] = JSON.parse(localStorage.getItem('evron_offline_alerts') || '[]');
          queue.push(event);
          localStorage.setItem('evron_offline_alerts', JSON.stringify(queue));
        }

        if (!wasOnline && status.connected) {
          // Flush queued offline alerts
          const queue: any[] = JSON.parse(localStorage.getItem('evron_offline_alerts') || '[]');
          for (const item of queue) {
            await raiseAlert(
              item.message + ` (Connection restored at ${new Date().toLocaleTimeString()})`,
              item.type
            );
          }
          if (queue.length > 0) {
            localStorage.removeItem('evron_offline_alerts');
            const name = employeeName || 'Employee';
            await raiseAlert(`✅ CONNECTIVITY RESTORED: ${name}'s device is back online.`, 'info');
          }
        }
      });

      // ── GPS ───────────────────────────────────────────────────────────────
      await checkGps();
      setChecking(false);

      gpsInterval = setInterval(checkGps, 30000);
    };

    init();

    return () => {
      networkListener?.remove?.();
      clearInterval(gpsInterval);
    };
  }, [checkGps]);

  return { gpsEnabled, permissionDenied, isOnline, latitude, longitude, checking };
}
