/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  MapPin,
  Map as MapIcon,
  Wifi,
  Smartphone,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Camera as CameraIcon,
  Activity,
  UserX,
  Sparkles,
  Search,
  Eye,
  Trash2,
  Lock,
  Compass,
  Navigation,
  Clock,
  MapPinned,
  FilterX
} from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { Employee } from '../types';
import { apiService } from '../services/api';
import LiveMap, { MapEmployee } from './LiveMap';

interface ProductivityComplianceHubProps {
  employees: Employee[];
  onTriggerAlert?: (detail: string, cameraName: string, status: 'critical' | 'warning' | 'info') => void;
}

const FORBIDDEN_APP_NAMES = ['whatsapp', 'instagram', 'clash', 'fakegps', 'vpn', 'tor', 'pubg', 'freefire'];

// Group flat location-log rows (from backend) into per-user objects with events
function groupLocationLogs(rows: any[]) {
  const byUser = new Map<number, any>();
  for (const row of rows) {
    const uid = row.user_id;
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        user_id: uid,
        user_name: row.user_name,
        employee_code: row.employee_code,
        department: row.department,
        total_pings: 0,
        events: [],
      });
    }
    const user = byUser.get(uid)!;
    user.total_pings++;
    user.events.push({
      type: 'ping',
      start: row.logged_at,
      end: row.logged_at,
      lat: parseFloat(row.latitude),
      lng: parseFloat(row.longitude),
      wifi_ssid: row.wifi_ssid,
      accuracy: row.accuracy,
      is_developer_mode: row.is_developer_mode,
      walk_distance_m: row.walk_distance_m,
      ping_count: 1,
    });
  }
  // Within each user, detect stays (≥10 min within ~50m radius)
  for (const user of byUser.values()) {
    user.events = detectStayEvents(user.events);
  }
  return Array.from(byUser.values());
}

function detectStayEvents(pings: any[]) {
  if (pings.length === 0) return [];
  const dist = (a: any, b: any) => {
    const dy = (a.lat - b.lat) * 111320;
    const dx = (a.lng - b.lng) * 108000;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const result: any[] = [];
  let i = 0;
  while (i < pings.length) {
    let j = i + 1;
    while (j < pings.length && dist(pings[i], pings[j]) <= 50) j++;
    const durationMs = new Date(pings[i].start).getTime() - new Date(pings[j - 1].start).getTime();
    const durationMin = Math.round(Math.abs(durationMs) / 60000);
    if (j - i >= 2 && durationMin >= 10) {
      result.push({ ...pings[i], type: 'stay', end: pings[j - 1].start, duration_minutes: durationMin, ping_count: j - i });
    } else {
      for (let k = i; k < j; k++) result.push({ ...pings[k], type: 'ping', duration_minutes: 0 });
    }
    i = j;
  }
  return result;
}

export default function ProductivityComplianceHub({ employees, onTriggerAlert }: ProductivityComplianceHubProps) {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'excel_export' | 'gps_history' | 'location_logs'>('tracker');
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  
  const [employeeStates, setEmployeeStates] = useState<Record<string, {
    walkedKm: number;
    offsiteMinutes: number;
    currentApp: string;
    isAppViolating: boolean;
    networkType: 'wifi' | 'cellular';
    wifiSsid: string;
    isSsidViolating: boolean;
    isWearingUniform: boolean;
    uniformComplianceRate: number;
    securityAlertCount: number;
    activeLat: number;
    activeLng: number;
    statusDetail: string;
    isDeveloperModeOn: boolean;
    wifiBypassedOrAirplaneMode: boolean;
  }>>({});

  const [gpsLogs, setGpsLogs] = useState<any[]>([]);
  const [isLoadingGps, setIsLoadingGps] = useState<boolean>(true);

  const [locationLogs, setLocationLogs] = useState<any[]>([]);
  const [isLoadingLocationLogs, setIsLoadingLocationLogs] = useState(false);
  const [locLogFrom, setLocLogFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [locLogTo, setLocLogTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [locLogUserId, setLocLogUserId] = useState<string>(''); // stores dbId as string

  const fetchLocationLogs = async () => {
    setIsLoadingLocationLogs(true);
    try {
      const params: { from?: string; to?: string; user_id?: number } = { from: locLogFrom, to: locLogTo };
      if (locLogUserId) params.user_id = Number(locLogUserId);
      const rows = await apiService.getLocationLogs(params);
      setLocationLogs(groupLocationLogs(rows));
    } catch { setLocationLogs([]); }
    setIsLoadingLocationLogs(false);
  };

  const COMPANY_SSID = 'EVRON-SECURE-WIFI';

  const refreshLiveData = async () => {
    try {
      const liveStates = await apiService.getGpsStates();
      if (liveStates && Object.keys(liveStates).length > 0) {
        setEmployeeStates(prev => {
          const merged: typeof prev = { ...prev };
          for (const [code, st] of Object.entries(liveStates)) {
            merged[code] = {
              ...st,
              // preserve manual overrides (e.g. simulated boundary exits) only if newer
              activeLat: st.activeLat,
              activeLng: st.activeLng,
            } as any;
          }
          return merged;
        });
        const logs = await apiService.getGpsLogs();
        setGpsLogs(logs);
      }
    } catch (err) {
      console.warn('Failed to pull live location data:', err);
    } finally {
      setIsLoadingGps(false);
    }
  };

  // Initial load + poll every 30s
  useEffect(() => {
    setIsLoadingGps(true);
    refreshLiveData();
    const interval = setInterval(refreshLiveData, 30_000);
    return () => clearInterval(interval);
  }, []);

  const [selectedEmpId, setSelectedEmpId] = useState<string>(
    employees[0]?.id || ''
  );

  // Geofence administrator variables
  const [geofenceCenter, setGeofenceCenter] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [geofenceRadius, setGeofenceRadius] = useState<number>(300);
  const [isDefiningGeofence, setIsDefiningGeofence] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [notifiedBreaches, setNotifiedBreaches] = useState<Record<string, 'inside' | 'outside'>>({});
  // Real-time admin GPS position (separate from geofence center)
  const [selfPos, setSelfPos] = useState<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<string | null>(null);

  const geofenceCenterRef = useRef(geofenceCenter);
  const geofenceRadiusRef = useRef(geofenceRadius);

  useEffect(() => {
    geofenceCenterRef.current = geofenceCenter;
  }, [geofenceCenter]);

  useEffect(() => {
    geofenceRadiusRef.current = geofenceRadius;
  }, [geofenceRadius]);

  const locateDevice = async () => {
    setIsLocating(true);
    try {
      // Request permission first — critical on Android
      let perm = await Geolocation.checkPermissions();
      if (perm.location === 'prompt' || perm.location === 'prompt-with-rationale') {
        const req = await Geolocation.requestPermissions({ permissions: ['location'] });
        perm = req;
      }
      if (perm.location === 'denied') return;

      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const newCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setSelfPos(newCenter);
      setGeofenceCenter(newCenter);
      runImmediateGeofenceCheckAll(newCenter, geofenceRadiusRef.current);
    } catch (err) {
      console.warn('Geolocation unavailable:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // Start GPS on mount: request permission, get initial fix, then watch continuously
  useEffect(() => {
    let cancelled = false;

    const startGps = async () => {
      try {
        let perm = await Geolocation.checkPermissions();
        if (perm.location === 'prompt' || perm.location === 'prompt-with-rationale') {
          const req = await Geolocation.requestPermissions({ permissions: ['location'] });
          perm = req;
        }
        if (perm.location === 'denied' || cancelled) return;

        // Initial one-shot for fast first paint
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
          if (!cancelled) {
            const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setSelfPos(pt);
            setGeofenceCenter(pt);
            runImmediateGeofenceCheckAll(pt, geofenceRadiusRef.current);
          }
        } catch {}

        // Continuous watch — selfPos updates in real-time, geofenceCenter stays fixed
        watchIdRef.current = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position, err) => {
            if (cancelled || err || !position) return;
            setSelfPos({ lat: position.coords.latitude, lng: position.coords.longitude });
          }
        );
      } catch (err) {
        console.warn('GPS init failed:', err);
      }
    };

    startGps();

    return () => {
      cancelled = true;
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch({ id: watchIdRef.current });
        watchIdRef.current = null;
      }
    };
  }, []);

  const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const latDiffMeters = (lat1 - lat2) * 111320;
    const lngDiffMeters = (lng1 - lng2) * 108000;
    return Math.sqrt(latDiffMeters * latDiffMeters + lngDiffMeters * lngDiffMeters);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!isDefiningGeofence) return;
    const newCenter = { lat, lng };
    setGeofenceCenter(newCenter);
    setIsDefiningGeofence(false);
    triggerOuterSystemAlert(
      `Administrating Geofence: Custom circular perimeter center updated to [${lat.toFixed(5)}, ${lng.toFixed(5)}].`,
      "Geofence",
      "info"
    );
    runImmediateGeofenceCheckAll(newCenter, geofenceRadius);
  };

  const checkEmployeeGeofence = (
    empId: string, 
    activeLat: number, 
    activeLng: number, 
    currentStates: any,
    addCctvAlert: boolean = true
  ) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return null;

    // Retrieve active config
    const center = geofenceCenterRef.current;
    const radius = geofenceRadiusRef.current;

    const distance = getDistanceInMeters(activeLat, activeLng, center.lat, center.lng);
    const isCurrentlyOutside = distance > radius;
    const cachedState = notifiedBreaches[empId] || 'inside';

    if (isCurrentlyOutside && cachedState !== 'outside') {
      // Set to outside
      setNotifiedBreaches(prev => ({ ...prev, [empId]: 'outside' }));
      
      const msg = `[GEOFENCE VIOLATION] Worker ${emp.name} (${empId}) crossed the secure geofence zone! Present Location: [${activeLat.toFixed(5)}, ${activeLng.toFixed(5)}], Distance is ${(distance).toFixed(0)}m (Max Limit configured: ${radius}m).`;
      
      triggerOuterSystemAlert(msg, "Geofence", "critical");

      if (addCctvAlert) {
        const timestamp = new Date().toLocaleTimeString();
        setCameraAlertsList(prev => {
          const alertId = `GEO-B-${Date.now()}-${empId}`;
          if (prev.some(a => a.id === alertId)) return prev;
          return [
            {
              id: alertId,
              timestamp,
              camera: 'Geofence Alert',
              type: 'Left safe zone',
              detail: msg,
              severity: 'critical',
              subject: `${emp.name} (${empId})`,
              isCleared: false
            },
            ...prev
          ];
        });
      }

      return {
        securityAlertCount: (currentStates[empId]?.securityAlertCount || 0) + 1,
        statusDetail: `Outside safe zone —${distance.toFixed(0)}m away).`
      };

    } else if (!isCurrentlyOutside && cachedState === 'outside') {
      // Returned inside
      setNotifiedBreaches(prev => ({ ...prev, [empId]: 'inside' }));
      
      const msg = `[GEOFENCE SECURED] Worker ${emp.name} (${empId}) returned inside the secure geofence boundaries.`;
      triggerOuterSystemAlert(msg, "Geofence", "info");

      if (addCctvAlert) {
        const timestamp = new Date().toLocaleTimeString();
        setCameraAlertsList(prev => {
          const alertId = `GEO-G-${Date.now()}-${empId}`;
          if (prev.some(a => a.id === alertId)) return prev;
          return [
            {
              id: alertId,
              timestamp,
              camera: 'Geofence Alert',
              type: 'Returned to safe zone',
              detail: msg,
              severity: 'info',
              subject: `${emp.name} (${empId})`,
              isCleared: true
            },
            ...prev
          ];
        });
      }

      return {
        statusDetail: `Securely returned within custom defined geofence boundary.`
      };
    }
    
    return null;
  };

  const runImmediateGeofenceCheckAll = (center: { lat: number; lng: number }, radius: number) => {
    setEmployeeStates(prev => {
      const next = { ...prev } as any;
      let changed = false;

      Object.entries(next).forEach(([empId, val]) => {
        const stateObj = val as any;
        const emp = employees.find(e => e.id === empId);
        if (!emp) return;

        const distance = getDistanceInMeters(stateObj.activeLat, stateObj.activeLng, center.lat, center.lng);
        const isCurrentlyOutside = distance > radius;
        const cachedState = notifiedBreaches[empId] || 'inside';

        if (isCurrentlyOutside && cachedState !== 'outside') {
          setNotifiedBreaches(p => ({ ...p, [empId]: 'outside' }));
          const msg = `[GEOFENCE VIOLATION] Worker ${emp.name} (${empId}) crossed the secure geofence zone! Present Location: [${stateObj.activeLat.toFixed(5)}, ${stateObj.activeLng.toFixed(5)}], Distance is ${(distance).toFixed(0)}m (Max Limit configured: ${radius}m).`;
          triggerOuterSystemAlert(msg, "Geofence", "critical");

          const timestamp = new Date().toLocaleTimeString();
          setCameraAlertsList(cPrev => {
            const alertId = `GEO-B-${Date.now()}-${empId}`;
            if (cPrev.some(a => a.id === alertId)) return cPrev;
            return [
              {
                id: alertId,
                timestamp,
                camera: 'Geofence Alert',
                type: 'Left safe zone',
                detail: msg,
                severity: 'critical',
                subject: `${emp.name} (${empId})`,
                isCleared: false
              },
              ...cPrev
            ];
          });

          next[empId] = {
            ...stateObj,
            securityAlertCount: stateObj.securityAlertCount + 1,
            statusDetail: `Outside safe zone —${distance.toFixed(0)}m away).`
          };
          changed = true;

        } else if (!isCurrentlyOutside && cachedState === 'outside') {
          setNotifiedBreaches(p => ({ ...p, [empId]: 'inside' }));
          const msg = `[GEOFENCE SECURED] Worker ${emp.name} (${empId}) returned inside the secure geofence boundaries.`;
          triggerOuterSystemAlert(msg, "Geofence", "info");

          const timestamp = new Date().toLocaleTimeString();
          setCameraAlertsList(cPrev => {
            const alertId = `GEO-G-${Date.now()}-${empId}`;
            if (cPrev.some(a => a.id === alertId)) return cPrev;
            return [
              {
                id: alertId,
                timestamp,
                camera: 'Geofence Alert',
                type: 'Returned to safe zone',
                detail: msg,
                severity: 'info',
                subject: `${emp.name} (${empId})`,
                isCleared: true
              },
              ...cPrev
            ];
          });

          next[empId] = {
            ...stateObj,
            statusDetail: `Securely returned within custom defined geofence boundary.`
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  };
  
  // Live geofence breach alerts (populated from real GPS checks only)
  const [cameraAlertsList, setCameraAlertsList] = useState<Array<{
    id: string;
    timestamp: string;
    camera: string;
    type: string;
    detail: string;
    severity: 'critical' | 'warning' | 'info';
    subject: string;
    isCleared: boolean;
  }>>([]);


  // Sync to outer system dashboard alert system
  const triggerOuterSystemAlert = (detail: string, cameraName: string, status: 'critical' | 'warning' | 'info') => {
    if (onTriggerAlert) {
      onTriggerAlert(detail, cameraName, status);
    }
  };

  const handleClearAlert = (id: string) => {
    setCameraAlertsList(prev => prev.map(a => a.id === id ? { ...a, isCleared: true } : a));
  };

  // Compile and trigger direct EXCEL file download inside user browser
  const handleExportExcel = () => {
    // Generate real CSV formatted data (fully matches EXCEL and spreadsheet applications)
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Employee ID,Employee Name,Department,Role,Status,Device ID,Walked Kilometers (Total),Other App Opens Today,Apps Used Today,Active Network Interface,WiFi SSID,Developer Mode,Security Violations Count,Latitude,Longitude\n';

    employees.forEach(emp => {
      const state = employeeStates[emp.id] || {
        walkedKm: 0,
        offsiteMinutes: 0,
        currentApp: 'Idle',
        isAppViolating: false,
        networkType: 'cellular',
        wifiSsid: 'None',
        isWearingUniform: true,
        uniformComplianceRate: 100,
        securityAlertCount: 0,
        activeLat: 12.9716,
        activeLng: 77.5946
      };

      const appsUsed = (() => {
        const detail = (state as any).appOpensDetail;
        if (!detail || typeof detail !== 'object') return '';
        return Object.entries(detail as Record<string, number>)
          .sort((a, b) => b[1] - a[1])
          .map(([app, n]) => `${app}(${n})`)
          .join('; ');
      })();

      const row = [
        emp.id,
        `"${emp.name.replace(/"/g, '""')}"`,
        `"${emp.department}"`,
        `"${emp.role}"`,
        emp.status,
        (state as any).deviceId || '',
        state.walkedKm,
        (state as any).otherAppOpens ?? 0,
        `"${appsUsed.replace(/"/g, '""')}"`,
        state.networkType,
        state.wifiSsid,
        state.isDeveloperModeOn ? 'YES' : 'NO',
        state.securityAlertCount,
        state.activeLat,
        state.activeLng
      ].join(',');

      csvContent += row + '\n';
    });

    // Create anchor and download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Evron_Employee_Productivity_Compliance_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter employees
  const filteredEmployeesList = employees.filter(emp => {
    const query = searchQuery.toLowerCase();
    return emp.name.toLowerCase().includes(query) || 
           emp.id.toLowerCase().includes(query) || 
           emp.department.toLowerCase().includes(query);
  });

  const selectedEmpState = employeeStates[selectedEmpId] || {
    walkedKm: 0,
    offsiteMinutes: 0,
    currentApp: 'Waiting for device data…',
    isAppViolating: false,
    networkType: 'cellular' as const,
    wifiSsid: '–',
    isSsidViolating: false,
    isWearingUniform: true,
    uniformComplianceRate: 100,
    securityAlertCount: 0,
    activeLat: geofenceCenter.lat,
    activeLng: geofenceCenter.lng,
    statusDetail: 'No live data yet. Employee must open the app.',
    isDeveloperModeOn: false,
    wifiBypassedOrAirplaneMode: false,
  };

  const selectedEmployeeObj = employees.find(e => e.id === selectedEmpId) || employees[0];

  return (
    <div className="space-y-6 overflow-x-hidden w-full" id="productivity-compliance-module-container">
      {/* Upper Module Banner */}
      <div className="flex flex-col gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl flex items-center gap-2">
            <Compass className="w-8 h-8 text-red-500 animate-spin-slow" />
            Productivity & Monitoring
          </h1>
        </div>

        {/* Tab Selection — horizontally scrollable on mobile */}
        <div className="flex items-center bg-zinc-950 p-1 border border-zinc-850 rounded-lg overflow-x-auto shrink-0 max-w-full gap-0.5" id="tabs-compliance-sub" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveSubTab('tracker')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'tracker'
                ? 'bg-red-500 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Location & App
          </button>
          <button
            onClick={() => setActiveSubTab('excel_export')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'excel_export'
                ? 'bg-red-500 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Report
          </button>
          <button
            onClick={() => {
              setActiveSubTab('gps_history');
              refreshLiveData();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'gps_history'
                ? 'bg-red-500 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Location History
          </button>
          <button
            onClick={() => { setActiveSubTab('location_logs'); fetchLocationLogs(); }}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              activeSubTab === 'location_logs'
                ? 'bg-red-500 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MapPinned className="w-3.5 h-3.5" />
            Location Logs
          </button>
        </div>
      </div>

      {activeSubTab === 'tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tracker-viewport-layout">
          {/* Left panel: Employee Roster select filter List */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between max-h-[680px] overflow-hidden" id="staff-select-card-compliance">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold font-mono tracking-wider text-red-500 uppercase">Active Staff</span>
                <span className="text-[10px] bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded font-mono border border-zinc-850">
                  {employees.filter(e => e.status !== 'On Leave').length} ACTIVE
                </span>
              </div>

              {/* Search input UI */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter by name, ID or split..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white pl-9 pr-4 py-2 rounded-lg placeholder-zinc-500 font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Employees selectable block */}
              <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1" id="compliance-scrolling-employees">
                {filteredEmployeesList.map(emp => {
                  const stateObj = employeeStates[emp.id] || {
                    walkedKm: 0,
                    offsiteMinutes: 0,
                    currentApp: 'Idle',
                    isAppViolating: false,
                    networkType: 'wifi',
                    isSsidViolating: false,
                    isWearingUniform: true,
                    uniformComplianceRate: 100,
                    securityAlertCount: 0,
                    isDeveloperModeOn: false,
                    wifiBypassedOrAirplaneMode: false
                  };

                  const isSelected = selectedEmpId === emp.id;
                  const offsiteHours = (stateObj.offsiteMinutes / 60).toFixed(1);

                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmpId(emp.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left border transition ${
                        isSelected 
                          ? 'bg-red-500/10 border-red-500' 
                          : 'bg-zinc-950/40 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={emp.avatar || `https://images.unsplash.com/photo-1540350390157-c74035bba300?w=120&auto=format&fit=facearea&facepad=2&q=80`} 
                          alt={emp.name} 
                          className="w-8 h-8 rounded-full border border-zinc-800 focus:no-referrer"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 leading-snug">
                          <h4 className="text-xs font-bold text-white font-sans truncate">{emp.name}</h4>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <span className="text-[9px] text-zinc-500 font-mono uppercase">{emp.id}</span>
                            {stateObj.isDeveloperModeOn && (
                              <span className="text-[7.5px] bg-red-950/60 text-red-400 border border-red-900/55 px-1 rounded font-mono font-bold font-semibold uppercase animate-pulse">
                                Dev Mode
                              </span>
                            )}
                            {stateObj.wifiBypassedOrAirplaneMode && (
                              <span className="text-[7.5px] bg-amber-950/60 text-amber-400 border border-amber-900/55 px-1 rounded font-mono font-bold font-semibold uppercase">
                                Offline
                              </span>
                            )}
                            {(stateObj as any).otherAppOpens > 0 && (
                              <span className={`text-[7.5px] px-1 rounded font-mono font-bold uppercase border ${
                                (stateObj as any).otherAppOpens > 10
                                  ? 'bg-red-950/60 text-red-400 border-red-900/55 animate-pulse'
                                  : 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                              }`}>
                                {(stateObj as any).otherAppOpens}× Apps
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end text-right font-mono shrink-0">
                        <span className={`text-[10px] font-bold ${stateObj.walkedKm > 1.5 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          {stateObj.walkedKm} KM
                        </span>
                        {stateObj.offsiteMinutes > 0 ? (
                          <span className={`text-[8px] bg-red-500/10 text-rose-400 border border-red-500/20 px-1 py-0.5 rounded font-bold mt-0.5`}>
                            {offsiteHours}H Offsite
                          </span>
                        ) : (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded font-bold mt-0.5">
                            Onsite
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono font-semibold flex items-center justify-between">
              <span>LIVE GPS · POLLS EVERY 30S</span>
              {Object.keys(employeeStates).length > 0
                ? <span className="text-emerald-400 animate-pulse">● {Object.keys(employeeStates).length} ACTIVE</span>
                : <span className="text-zinc-600">● AWAITING DATA</span>
              }
            </div>
          </div>

          {/* Right panel: Active live telemetry details, GPS Visualizer, and Canvas Map */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* 1. Vector Mapping Engine */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative">
              <div className="p-3 bg-zinc-900 border-b border-zinc-800/80 flex items-center justify-between font-mono text-[10px] text-zinc-400 gap-2">
                <span className="flex items-center gap-1.5 font-bold uppercase text-red-500 animate-pulse">
                  <Activity className="w-3.5 h-3.5 text-red-500" />
                  Live Map — {selectedEmployeeObj?.name || '—'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span>Zone radius: <strong className="text-white">{geofenceRadius}m</strong></span>
                  <button
                    onClick={locateDevice}
                    disabled={isLocating}
                    title="Locate my device"
                    className="flex items-center gap-1 px-2 py-1 bg-zinc-800 border border-zinc-700 hover:border-red-500 text-zinc-300 hover:text-white rounded text-[9px] font-mono uppercase font-bold transition disabled:opacity-50"
                  >
                    <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                    {isLocating ? 'LOCATING...' : 'LOCATE'}
                  </button>
                </div>
              </div>

              {/* Real Leaflet map with employee GPS pins */}
              <LiveMap
                centerLat={selfPos?.lat ?? geofenceCenter.lat ?? 0}
                centerLng={selfPos?.lng ?? geofenceCenter.lng ?? 0}
                zoom={(selfPos?.lat || geofenceCenter.lat) ? 15 : 2}
                geofenceRadius={geofenceRadius}
                height="360px"
                onMapClick={isDefiningGeofence ? handleMapClick : undefined}
                selfLat={selfPos?.lat}
                selfLng={selfPos?.lng}
                employees={employees.map(emp => {
                  const st = employeeStates[emp.id];
                  const lat = st?.activeLat ?? geofenceCenter.lat;
                  const lng = st?.activeLng ?? geofenceCenter.lng;
                  const inside = getDistanceInMeters(lat, lng, geofenceCenter.lat, geofenceCenter.lng) <= geofenceRadius;
                  return {
                    id: emp.id,
                    name: emp.name,
                    lat,
                    lng,
                    status: emp.status,
                    insideGeofence: inside,
                  } as MapEmployee;
                })}
              />

              {/* Geofence Administrator Custom Config Panel */}
              <div className="border-t border-zinc-850 p-4 bg-zinc-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold font-mono text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-red-500" />
                      Safe Zone Settings
                    </h4>
                    <p className="text-[9px] text-zinc-500">
                      Set a boundary area on the map. You will get an alert when an employee leaves it.
                    </p>
                  </div>
                  
                  {/* Drawing Mode Toggle Button */}
                  <button
                    onClick={() => {
                      setIsDefiningGeofence(!isDefiningGeofence);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-[9px] font-mono leading-none tracking-wider uppercase font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      isDefiningGeofence
                        ? 'bg-red-550 border-red-500 text-white animate-pulse'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <MapIcon className="w-3.5 h-3.5 text-red-500" />
                    {isDefiningGeofence ? 'Cancel' : '🎯 Set Center on Map'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column Controllers */}
                  <div className="space-y-3">
                    {/* Radius Slider Tool */}
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase font-black">Boundary Radius</span>
                        <strong className="text-xs font-mono text-white">{geofenceRadius} meters</strong>
                      </div>
                      <input 
                        type="range"
                        min="100"
                        max="1000"
                        step="50"
                        value={geofenceRadius}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setGeofenceRadius(val);
                          triggerOuterSystemAlert(
                            `Administrating Geofence: Limit radius threshold updated to ${val} meters.`,
                            "Geofence",
                            "info"
                          );
                          runImmediateGeofenceCheckAll(geofenceCenter, val);
                        }}
                        className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-zinc-600">
                        <span>Min (100m)</span>
                        <span>Max (1000m)</span>
                      </div>
                    </div>

                    {/* Coordinates Values Readouts */}
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg grid grid-cols-2 gap-2 text-[9px] font-mono">
                      <div>
                        <span className="text-zinc-600 block text-[8px] uppercase">CENTER LATITUDE</span>
                        <span className="text-zinc-300 font-bold">{geofenceCenter.lat.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600 block text-[8px] uppercase">CENTER LONGITUDE</span>
                        <span className="text-zinc-300 font-bold">{geofenceCenter.lng.toFixed(5)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column — Live geofence status for selected employee */}
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg space-y-2">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase font-black block">Live Status — {selectedEmployeeObj?.name || '—'}</span>
                      {(() => {
                        const dist = getDistanceInMeters(
                          selectedEmpState.activeLat,
                          selectedEmpState.activeLng,
                          geofenceCenter.lat,
                          geofenceCenter.lng
                        );
                        const isBreached = dist > geofenceRadius;
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-zinc-400">Distance from zone:</span>
                              <strong className={`font-mono ${isBreached ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {dist.toFixed(0)}m / {geofenceRadius}m
                              </strong>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-500">Zone status:</span>
                              <span className={`font-mono uppercase font-black text-[9px] px-1 rounded ${
                                isBreached
                                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse'
                                  : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              }`}>
                                {isBreached ? '🚨 Outside zone' : '🟢 Inside zone'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono pt-1 border-t border-zinc-900">
                              <div>
                                <span className="text-zinc-600 block text-[8px] uppercase">Latitude</span>
                                <span className="text-zinc-300">{selectedEmpState.activeLat?.toFixed(5) || '—'}</span>
                              </div>
                              <div>
                                <span className="text-zinc-600 block text-[8px] uppercase">Longitude</span>
                                <span className="text-zinc-300">{selectedEmpState.activeLng?.toFixed(5) || '—'}</span>
                              </div>
                            </div>
                            <div className="text-[9px] font-mono text-zinc-500 pt-1 border-t border-zinc-900">
                              {selectedEmpState.statusDetail || 'No live data yet.'}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. MDM Mobile App Guards / WIFI Logs Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone Security */}
              <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-rose-500" />
                    <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Phone Security</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Device ID */}
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase block">Device ID</span>
                      <span className="text-[9px] font-mono text-zinc-300 break-all text-right max-w-[65%]">
                        {(selectedEmpState as any).deviceId || '—'}
                      </span>
                    </div>
                  </div>

                  {/* APP LOCKOUT STATE INDICATOR */}
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase block">App Status</span>
                      {selectedEmpState.isDeveloperModeOn ? (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          🚫 App Blocked
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          🟢 Active
                        </span>
                      )}
                    </div>

                    {selectedEmpState.isDeveloperModeOn ? (
                      <div className="bg-red-950/20 border border-red-900/20 p-2.5 rounded text-[10px] leading-relaxed text-red-400 font-sans">
                        <strong>Developer mode is on.</strong> The app has been blocked on this device. Please contact your admin.
                      </div>
                    ) : (
                      <div className="bg-emerald-950/20 border border-emerald-900/20 p-2.5 rounded text-[10px] leading-relaxed text-zinc-400 font-sans">
                        Device is secure. App is running and tracking normally.
                      </div>
                    )}
                  </div>

                  {/* Other app opens count */}
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-550 font-mono uppercase block">Other Apps Used Today</span>
                      <span className={`text-sm font-bold font-mono ${
                        (selectedEmpState as any).otherAppOpens > 10
                          ? 'text-red-400'
                          : (selectedEmpState as any).otherAppOpens > 5
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}>
                        {(selectedEmpState as any).otherAppOpens ?? 0}×
                      </span>
                    </div>

                    {/* Per-app breakdown */}
                    {(() => {
                      const detail = (selectedEmpState as any).appOpensDetail;
                      const entries = detail && typeof detail === 'object'
                        ? Object.entries(detail) as [string, number][]
                        : [];
                      if (entries.length === 0) return (
                        <p className="text-[9px] text-zinc-600 font-mono">No app usage data available.</p>
                      );
                      const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 6);
                      return (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {sorted.map(([app, count]) => (
                            <span key={app} className={`text-[8px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                              FORBIDDEN_APP_NAMES.some(n => app.toLowerCase().includes(n))
                                ? 'bg-rose-950/40 text-rose-400 border-rose-900/50'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                            }`}>
                              {app} ×{count}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Network & Wi-Fi */}
              <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Network & Wi-Fi</h3>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* EVASION DETECTION BANNER */}
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-550 font-mono uppercase block">Connection Status</span>
                      {selectedEmpState.wifiBypassedOrAirplaneMode ? (
                        <span className="bg-red-550 border border-red-550 text-white text-[8px] font-mono px-2 py-0.5 rounded font-black uppercase animate-bounce flex items-center gap-1">
                          🚨 Offline / Airplane Mode
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                          🟢 Connected
                        </span>
                      )}
                    </div>

                    {selectedEmpState.wifiBypassedOrAirplaneMode ? (
                      <div className="bg-red-950/30 border border-red-500/30 p-2.5 rounded text-[10px] leading-relaxed text-amber-300 font-sans">
                        <strong className="text-red-400 block mb-0.5">⚠️ Offline or Airplane Mode detected.</strong>
                        Employee turned off mobile data or enabled Airplane Mode. They are still connected to the office Wi-Fi, which means they are physically present but hiding their GPS.
                      </div>
                    ) : (
                      <div className="bg-emerald-950/20 border border-emerald-900/20 p-2.5 rounded text-[10px] leading-relaxed text-zinc-450 font-sans">
                        Network is active and tracking normally.
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-mono uppercase block">Wi-Fi Network</span>
                      <strong className={`text-xs font-mono ${selectedEmpState.wifiBypassedOrAirplaneMode ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                        {selectedEmpState.wifiBypassedOrAirplaneMode ? 'EVRON-SECURE-WIFI (offline detected)' : selectedEmpState.wifiSsid}
                      </strong>
                    </div>

                    {selectedEmpState.wifiBypassedOrAirplaneMode ? (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                        🚨 No internet
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                        ✅ Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Patrol Details Panel */}
            <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 font-semibold" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-sans">{selectedEmployeeObj?.name}</h4>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  {selectedEmpState.statusDetail} · Total alerts: <strong className="text-red-400">{selectedEmpState.securityAlertCount}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {activeSubTab === 'gps_history' && (
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-6" id="compliance-gps-history-subtab">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-sm font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-5 h-5 text-red-500 animate-pulse" />
                GPS Location History
              </h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Location history recorded from staff devices during check-in and check-out.
              </p>
            </div>
            
            <button
              onClick={() => {
                setIsLoadingGps(true);
                refreshLiveData();
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 hover:shadow-red-500/10 shadow-md text-white font-bold font-mono text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              FORCE REFRESH SERVER DATABASE LOGS
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-500 font-bold font-mono uppercase block">
                Location records ({gpsLogs.length})
              </span>
              <span className="text-[9px] font-mono text-zinc-400">
                Data Backend Source: <strong className="text-emerald-400">JSON DB Endpoints Connected</strong>
              </span>
            </div>

            {isLoadingGps ? (
              <div className="py-20 text-center font-mono text-zinc-500 text-xs animate-pulse flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
                Loading...
              </div>
            ) : gpsLogs.length === 0 ? (
              <div className="py-20 text-center font-mono border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs bg-zinc-950/40">
                🚨 No location data recorded yet. Staff need to check in using the mobile app.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-950">
                <table className="w-full text-left border-collapse text-[10px] font-mono">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 font-bold uppercase select-none">
                      <th className="p-3 border-r border-zinc-850">Timestamp</th>
                      <th className="p-3 border-r border-zinc-850">Employee</th>
                      <th className="p-3 border-r border-zinc-850 text-center">Security Status</th>
                      <th className="p-3 border-r border-zinc-850 text-right">Latitude</th>
                      <th className="p-3 border-r border-zinc-850 text-right">Longitude</th>
                      <th className="p-3 border-r border-zinc-850 text-right">Precision</th>
                      <th className="p-3 border-r border-zinc-850">Registered app</th>
                      <th className="p-3 border-r border-zinc-850">Wifi Ssid</th>
                      <th className="p-3">Compliance Activity detail / remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {gpsLogs.map((log) => {
                      const hasAlert = log.isAppViolating || log.isSsidViolating || log.isDeveloperModeOn || log.wifiBypassedOrAirplaneMode;
                      return (
                        <tr key={log.id} className="hover:bg-zinc-900/40 transition">
                          <td className="p-3 border-r border-zinc-850 text-zinc-400 font-semibold">{log.timestamp}</td>
                          <td className="p-3 border-r border-zinc-850 font-sans text-white font-bold flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full overflow-hidden bg-zinc-850 border border-zinc-800 flex shrink-0 items-center justify-center text-[8px] font-bold">
                              {log.avatar ? (
                                <img src={apiService.getFileUrl(log.avatar)} alt="" className="w-full h-full object-cover" />
                              ) : (
                                log.employeeId.slice(-3)
                              )}
                            </span>
                            <div>
                              <div className="font-semibold">{log.employeeName || 'Anonymous Worker'}</div>
                              <div className="text-[8px] font-mono text-zinc-500">{log.employeeId}</div>
                            </div>
                          </td>
                          <td className="p-3 border-r border-zinc-850 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded text-[8.5px] ${
                              hasAlert 
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {hasAlert ? '🚨 WARNING' : '🟢 SECURE'}
                            </span>
                          </td>
                          <td className="p-3 border-r border-zinc-850 text-right font-bold text-white">{Number(log.lat).toFixed(5)}°</td>
                          <td className="p-3 border-r border-zinc-850 text-right font-bold text-white">{Number(log.lng).toFixed(5)}°</td>
                          <td className="p-3 border-r border-zinc-850 text-right text-zinc-500">±{log.accuracy || 10}m</td>
                          <td className={`p-3 border-r border-zinc-850 ${log.isAppViolating ? 'text-red-400 font-bold bg-rose-500/5' : 'text-zinc-400'}`}>
                            {log.currentApp || 'None'}
                          </td>
                          <td className={`p-3 border-r border-zinc-850 ${log.isSsidViolating ? 'text-amber-400' : 'text-zinc-400'}`}>
                            {log.wifiSsid || 'None'}
                          </td>
                          <td className="p-3 text-zinc-300 font-sans text-[10.5px] max-w-[300px] truncate" title={log.statusDetail}>
                            {log.statusDetail || 'Telemetry log generated.'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'excel_export' && (
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-6" id="compliance-reports-excel-subtab">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-sm font-bold font-sans text-white">Employee Activity Export</h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">Download a CSV of all employees with attendance, location status, and security info.</p>
            </div>
            
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/20 shadow-md text-white font-bold font-mono text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>

          {/* Detailed Excel Grid Preview */}
          <div className="space-y-3">
            <span className="text-[10px] text-zinc-500 font-bold font-mono uppercase block">Active Ledger Rows Preview</span>
            
            <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-950">
              <table className="w-full text-left border-collapse text-[10px] font-mono">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 font-bold uppercase select-none">
                    <th className="p-3 border-r border-zinc-850">Employee Code</th>
                    <th className="p-3 border-r border-zinc-850">Name</th>
                    <th className="p-3 border-r border-zinc-850">Department</th>
                    <th className="p-3 border-r border-zinc-850 text-center">Roster Status</th>
                    <th className="p-3 border-r border-zinc-850 text-right">Walked Kilometers</th>
                    <th className="p-3 border-r border-zinc-850 text-right">Offsite Duration</th>
                    <th className="p-3 border-r border-zinc-850">Active MDM App</th>
                    <th className="p-3 border-r border-zinc-850">Gateway Conn</th>
                    <th className="p-3 border-r border-zinc-850 text-center">Uniform Compliance</th>
                    <th className="p-3 text-center">Logged Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {employees.map(emp => {
                    const state = employeeStates[emp.id] || {
                      walkedKm: 0,
                      offsiteMinutes: 0,
                      currentApp: 'Idle',
                      isAppViolating: false,
                      networkType: 'wifi',
                      wifiSsid: 'Disconnected',
                      isWearingUniform: true,
                      uniformComplianceRate: 100,
                      securityAlertCount: 0
                    };

                    return (
                      <tr key={emp.id} className="hover:bg-zinc-900/40 transition">
                        <td className="p-3 border-r border-zinc-850 font-bold text-red-400 font-mono">{emp.id}</td>
                        <td className="p-3 border-r border-zinc-850 font-sans text-white font-bold">{emp.name}</td>
                        <td className="p-3 border-r border-zinc-850 font-sans">{emp.department}</td>
                        <td className="p-3 border-r border-zinc-850 text-center font-semibold">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            emp.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            emp.status === 'Late' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            emp.status === 'On Leave' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {emp.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 border-r border-zinc-850 text-right text-white font-bold">{state.walkedKm.toFixed(2)} km</td>
                        <td className="p-3 border-r border-zinc-850 text-right text-zinc-400">{state.offsiteMinutes} min</td>
                        <td className={`p-3 border-r border-zinc-850 ${state.isAppViolating ? 'text-red-400 font-bold bg-rose-500/5' : 'text-zinc-300'}`}>
                          {state.currentApp}
                        </td>
                        <td className="p-3 border-r border-zinc-850 text-zinc-400 truncate max-w-[120px]">{state.wifiSsid}</td>
                        <td className="p-3 border-r border-zinc-850 text-center font-bold">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] ${
                            state.isWearingUniform ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {state.uniformComplianceRate}%
                          </span>
                        </td>
                        <td className="p-3 text-center text-red-400 font-bold bg-zinc-900/10">
                          {state.securityAlertCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'location_logs' && (
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-5" id="compliance-location-logs-subtab">
          {/* Header + filters */}
          <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPinned className="w-4 h-4 text-red-500" />
                Employee Location Logs
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Full movement history. Stays of 10+ minutes at one location are highlighted.</p>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">From</span>
                <input type="date" value={locLogFrom} onChange={e => setLocLogFrom(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1.5 font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">To</span>
                <input type="date" value={locLogTo} onChange={e => setLocLogTo(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1.5 font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Employee</span>
                <select value={locLogUserId} onChange={e => setLocLogUserId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1.5 font-mono">
                  <option value="">All employees</option>
                  {employees.map(e => <option key={e.id} value={e.dbId ?? ''}>{e.name}</option>)}
                </select>
              </div>
              <button onClick={fetchLocationLogs}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-mono rounded-lg transition cursor-pointer">
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLocationLogs ? 'animate-spin' : ''}`} />
                Load Logs
              </button>
              {locationLogs.length > 0 && (
                <a href={apiService.getLocationLogsExportUrl({ from: locLogFrom, to: locLogTo, user_id: locLogUserId ? Number(locLogUserId) : undefined })}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono rounded-lg transition cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </a>
              )}
            </div>
          </div>

          {isLoadingLocationLogs ? (
            <div className="py-16 flex items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
              <RefreshCw className="w-5 h-5 animate-spin text-red-500" /> Loading location logs...
            </div>
          ) : locationLogs.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs font-mono">
              No location data for the selected period. Make sure employees are using the mobile app with GPS enabled.
            </div>
          ) : (
            <div className="space-y-5">
              {locationLogs.map(user => (
                <div key={user.user_id} className="border border-zinc-800 rounded-xl overflow-hidden">
                  {/* Employee header */}
                  <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
                        {user.user_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-none">{user.user_name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{user.employee_code} · {user.department}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-400 shrink-0">{user.total_pings} pings</span>
                  </div>

                  {/* Events timeline */}
                  {user.events.length === 0 ? (
                    <p className="text-xs text-zinc-500 font-mono p-4">No movement events detected.</p>
                  ) : (
                    <div className="divide-y divide-zinc-800/60">
                      {user.events.map((ev: any, i: number) => (
                        <div key={i} className={`flex items-start gap-3 px-4 py-3 ${ev.type === 'stay' ? 'bg-amber-500/5' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            ev.type === 'stay' ? 'bg-amber-500/20' : 'bg-zinc-800'
                          }`}>
                            {ev.type === 'stay'
                              ? <Clock className="w-4 h-4 text-amber-400" />
                              : <Navigation className="w-4 h-4 text-zinc-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold font-mono uppercase px-2 py-0.5 rounded ${
                                ev.type === 'stay'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}>
                                {ev.type === 'stay' ? `Stay · ${ev.duration_minutes} min` : 'Ping'}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500">
                                {new Date(ev.start).toLocaleTimeString()}{ev.type === 'stay' ? ` → ${new Date(ev.end).toLocaleTimeString()}` : ''}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 mt-1 font-mono">
                              {ev.lat.toFixed(5)}, {ev.lng.toFixed(5)}
                            </p>
                            {(ev.wifi_ssid || ev.last_app) && (
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {ev.wifi_ssid && <span>Wi-Fi: {ev.wifi_ssid} · </span>}
                                {ev.last_app && <span>App: {ev.last_app}</span>}
                              </p>
                            )}
                            <a
                              href={`https://maps.google.com/?q=${ev.lat},${ev.lng}`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-red-400 hover:text-red-300 mt-0.5 inline-block font-mono underline underline-offset-2"
                            >
                              View on Google Maps
                            </a>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-600 shrink-0">{ev.ping_count}p</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
