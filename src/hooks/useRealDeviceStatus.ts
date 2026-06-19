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
  accuracy: number;
  checking: boolean;
  locationReady: boolean;
  refreshLocation: () => Promise<void>;
}

export function useRealDeviceStatus(employeeName?: string): RealDeviceStatus {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [checking, setChecking] = useState(true);
  const [locationReady, setLocationReady] = useState(false);

  const prevGpsRef = useRef<boolean | null>(null);
  const prevOnlineRef = useRef<boolean | null>(null);
  const watchIdRef = useRef<string | null>(null);

  const raiseAlert = async (message: string, type: 'critical' | 'warning' | 'info') => {
    try {
      await apiService.addSimulatorAlert(message, type);
    } catch {}
  };

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current !== null) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
  }, []);

  const startWatching = useCallback(async () => {
    await stopWatching();

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

      // Get immediate position first so the map shows real location right away
      try {
        const initial = await Geolocation.getCurrentPosition({
          timeout: 10000,
          enableHighAccuracy: true,
        });
        setLatitude(initial.coords.latitude);
        setLongitude(initial.coords.longitude);
        setAccuracy(initial.coords.accuracy ?? 0);
        setGpsEnabled(true);
        setPermissionDenied(false);
        setLocationReady(true);
        prevGpsRef.current = true;
      } catch {
        // Will be caught by watchPosition callback below
      }

      // Start continuous watch — updates on every device movement
      // No timeout on watchPosition — let the OS deliver fixes when available
      watchIdRef.current = await Geolocation.watchPosition(
        { enableHighAccuracy: true },
        async (position, err) => {
          if (err || !position) {
            setGpsEnabled(false);
            if (prevGpsRef.current !== false) {
              prevGpsRef.current = false;
              const name = employeeName || 'Employee';
              const reason =
                (err as any)?.code === 1
                  ? 'Location permission denied.'
                  : (err as any)?.code === 2
                  ? 'Device GPS / Location services are OFF.'
                  : 'Location unavailable.';
              await raiseAlert(
                `🚨 GPS DISABLED: ${name} — ${reason} Attendance check-in is now BLOCKED.`,
                'critical'
              );
            }
            return;
          }

          if (position.coords.accuracy > 150) return;
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setAccuracy(position.coords.accuracy ?? 0);
          setGpsEnabled(true);
          setPermissionDenied(false);
          setLocationReady(true);

          if (prevGpsRef.current === false) {
            prevGpsRef.current = true;
            const name = employeeName || 'Employee';
            await raiseAlert(`✅ GPS RESTORED: ${name}'s device location is now active.`, 'info');
          } else {
            prevGpsRef.current = true;
          }
        }
      );
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
  }, [employeeName, stopWatching]);

  // Force an immediate one-shot position fetch (for the refresh button)
  const refreshLocation = useCallback(async () => {
    try {
      const pos = await Geolocation.getCurrentPosition({
        timeout: 10000,
        enableHighAccuracy: true,
      });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
      setAccuracy(pos.coords.accuracy ?? 0);
      setGpsEnabled(true);
      setPermissionDenied(false);
      setLocationReady(true);
    } catch (err: any) {
      setGpsEnabled(false);
    }
  }, []);

  useEffect(() => {
    let networkListener: any;

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
      await startWatching();
      setChecking(false);
    };

    init();

    return () => {
      networkListener?.remove?.();
      stopWatching();
    };
  }, [startWatching, stopWatching, employeeName]);

  return { gpsEnabled, permissionDenied, isOnline, latitude, longitude, accuracy, checking, locationReady, refreshLocation };
}
