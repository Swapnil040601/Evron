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

const formatDist = (m: number): string =>
  m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

export default function ProductivityComplianceHub({ employees, onTriggerAlert }: ProductivityComplianceHubProps) {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'excel_export' | 'gps_history'>('tracker');
  
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
  const [todaySelfies, setTodaySelfies] = useState<Record<string, {
    punch_in_selfie: string | null;
    punch_out_selfie: string | null;
    remarks: string | null;
    punch_in_time: string | null;
    punch_out_time: string | null;
    user_name: string;
  }>>({});
  const [isLoadingGps, setIsLoadingGps] = useState<boolean>(true);

  // Export filters for Location History download
  const [exportFrom, setExportFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportUserId, setExportUserId] = useState<string>('');

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

  const fetchTodaySelfies = async () => {
    try {
      const rows = await apiService.getTodayAttendanceSelfies();
      const map: typeof todaySelfies = {};
      for (const r of rows) {
        map[String(r.user_id)] = {
          punch_in_selfie: r.punch_in_selfie || null,
          punch_out_selfie: r.punch_out_selfie || null,
          remarks: r.remarks || null,
          punch_in_time: r.mobile_punch_in
            ? new Date(r.mobile_punch_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : null,
          punch_out_time: r.mobile_punch_out
            ? new Date(r.mobile_punch_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : null,
          user_name: r.user_name || '',
        };
      }
      setTodaySelfies(map);
    } catch {}
  };

  useEffect(() => {
    fetchTodaySelfies();
    const interval = setInterval(fetchTodaySelfies, 60_000);
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

  // GPS watch only while on tracker tab — stops when user switches to other tabs
  // This prevents continuous setSelfPos re-renders from crashing the app when
  // location logs are loaded (500 rows re-rendering every GPS tick = OOM crash)
  useEffect(() => {
    if (activeSubTab !== 'tracker') return;

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
        const watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true },
          (position, err) => {
            if (cancelled || err || !position) return;
            setSelfPos({ lat: position.coords.latitude, lng: position.coords.longitude });
          }
        );
        // Component may have unmounted while watchPosition was resolving
        if (cancelled) {
          Geolocation.clearWatch({ id: watchId });
        } else {
          watchIdRef.current = watchId;
        }
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
  }, [activeSubTab]);

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
      
      const msg = `[GEOFENCE VIOLATION] Worker ${emp.name} (${empId}) crossed the secure geofence zone! Present Location: [${activeLat.toFixed(5)}, ${activeLng.toFixed(5)}], Distance is ${formatDist(distance)} (Max Limit configured: ${formatDist(radius)}).`;
      
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
        statusDetail: `Outside safe zone — ${formatDist(distance)} away.`
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
          const msg = `[GEOFENCE VIOLATION] Worker ${emp.name} (${empId}) crossed the secure geofence zone! Present Location: [${stateObj.activeLat.toFixed(5)}, ${stateObj.activeLng.toFixed(5)}], Distance is ${formatDist(distance)} (Max Limit configured: ${formatDist(radius)}).`;
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
            statusDetail: `Outside safe zone — ${formatDist(distance)} away.`
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
        </div>
      </div>

      {activeSubTab === 'tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tracker-viewport-layout">
          {/* Left panel: Employee selector dropdown */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-4" id="staff-select-card-compliance">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold font-mono tracking-wider text-red-500 uppercase">Select Employee</span>
              <span className="text-[10px] bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded font-mono border border-zinc-850">
                {employees.filter(e => e.status !== 'On Leave').length} ACTIVE
              </span>
            </div>

            {/* Search + Dropdown */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white pl-9 pr-4 py-2 rounded-lg placeholder-zinc-500 font-mono focus:outline-none focus:border-red-500"
                />
              </div>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white p-2.5 rounded-lg font-mono focus:outline-none focus:border-red-500 appearance-none cursor-pointer"
              >
                {filteredEmployeesList.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected employee summary card */}
            {selectedEmployeeObj && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedEmployeeObj.avatar || `https://images.unsplash.com/photo-1540350390157-c74035bba300?w=120&auto=format&fit=facearea&facepad=2&q=80`}
                    alt={selectedEmployeeObj.name}
                    className="w-10 h-10 rounded-full border border-zinc-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white font-sans truncate">{selectedEmployeeObj.name}</h4>
                    <span className="text-[9px] text-zinc-500 font-mono uppercase">{selectedEmployeeObj.id} · {selectedEmployeeObj.department}</span>
                  </div>
                </div>

                {/* Quick status badges */}
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmpState.isDeveloperModeOn && (
                    <span className="text-[8px] bg-red-950/60 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase animate-pulse">Dev Mode</span>
                  )}
                  {selectedEmpState.wifiBypassedOrAirplaneMode && (
                    <span className="text-[8px] bg-amber-950/60 text-amber-400 border border-amber-900/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Offline</span>
                  )}
                  {(selectedEmpState as any).otherAppOpens > 0 && (
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border ${
                      (selectedEmpState as any).otherAppOpens > 10
                        ? 'bg-red-950/60 text-red-400 border-red-900/40'
                        : 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                    }`}>
                      {(selectedEmpState as any).otherAppOpens}× Apps
                    </span>
                  )}
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border ${
                    selectedEmpState.walkedKm > 1.5
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}>
                    {selectedEmpState.walkedKm} KM
                  </span>
                </div>

                {/* Status line */}
                <div className="text-[9px] font-mono text-zinc-500 border-t border-zinc-800 pt-2">
                  {selectedEmpState.statusDetail || 'No live data yet.'}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono font-semibold flex items-center justify-between">
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
                  <span>Zone radius: <strong className="text-white">{formatDist(geofenceRadius)}</strong></span>
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
                        <strong className="text-xs font-mono text-white">{formatDist(geofenceRadius)}</strong>
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
                                {formatDist(dist)} / {formatDist(geofenceRadius)}
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

            {/* Today's Attendance Selfies for selected employee */}
            {(() => {
              const empDbId = String((selectedEmployeeObj as any)?.dbId ?? '');
              const selfieData = empDbId ? todaySelfies[empDbId] : null;
              return (
                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <CameraIcon className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Today's Punch Selfies</h3>
                    <button
                      onClick={fetchTodaySelfies}
                      className="ml-auto text-[9px] font-mono text-zinc-500 hover:text-white transition px-2 py-0.5 rounded border border-zinc-800 hover:border-zinc-600"
                    >
                      REFRESH
                    </button>
                  </div>
                  {selfieData ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">
                            Punch In {selfieData.punch_in_time ? `· ${selfieData.punch_in_time}` : '· Not punched in'}
                          </span>
                          {selfieData.punch_in_selfie ? (
                            <img
                              src={apiService.getFileUrl(selfieData.punch_in_selfie)}
                              alt="punch-in selfie"
                              className="w-full h-32 object-cover rounded-lg border border-emerald-500/30"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-32 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                              <span className="text-[9px] font-mono text-zinc-600">No selfie</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">
                            Punch Out {selfieData.punch_out_time ? `· ${selfieData.punch_out_time}` : '· Not punched out'}
                          </span>
                          {selfieData.punch_out_selfie ? (
                            <img
                              src={apiService.getFileUrl(selfieData.punch_out_selfie)}
                              alt="punch-out selfie"
                              className="w-full h-32 object-cover rounded-lg border border-zinc-600/30"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-32 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                              <span className="text-[9px] font-mono text-zinc-600">
                                {selfieData.punch_out_time ? 'No selfie' : 'Not punched out'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {selfieData.remarks && (
                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[10px] font-mono text-zinc-400 italic">
                          "{selfieData.remarks}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-[10px] font-mono text-zinc-600">
                      No attendance record today for {selectedEmployeeObj?.name || 'this employee'}
                    </div>
                  )}
                </div>
              );
            })()}

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

          {/* All Employees — Today's Punch Selfies */}
          {Object.keys(todaySelfies).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <CameraIcon className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">All Employees — Today's Punch Selfies</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {Object.entries(todaySelfies).map(([userId, data]) => (
                  <div key={userId} className="flex-shrink-0 w-36 space-y-1.5">
                    <div className="text-[9px] font-mono text-zinc-400 font-bold truncate">{data.user_name || `User ${userId}`}</div>
                    <div className="grid grid-cols-2 gap-1">
                      {data.punch_in_selfie ? (
                        <div className="relative">
                          <img
                            src={apiService.getFileUrl(data.punch_in_selfie)}
                            alt="in"
                            title={`Punch-in ${data.punch_in_time || ''}`}
                            className="w-full h-16 object-cover rounded border border-emerald-500/30"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <span className="absolute bottom-0.5 left-0.5 text-[7px] font-mono bg-black/70 text-emerald-400 px-0.5 rounded">IN</span>
                        </div>
                      ) : (
                        <div className="w-full h-16 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                          <span className="text-[7px] font-mono text-zinc-700">—</span>
                        </div>
                      )}
                      {data.punch_out_selfie ? (
                        <div className="relative">
                          <img
                            src={apiService.getFileUrl(data.punch_out_selfie)}
                            alt="out"
                            title={`Punch-out ${data.punch_out_time || ''}`}
                            className="w-full h-16 object-cover rounded border border-zinc-600/30"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <span className="absolute bottom-0.5 left-0.5 text-[7px] font-mono bg-black/70 text-zinc-400 px-0.5 rounded">OUT</span>
                        </div>
                      ) : (
                        <div className="w-full h-16 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center">
                          <span className="text-[7px] font-mono text-zinc-700">—</span>
                        </div>
                      )}
                    </div>
                    {data.punch_in_time && (
                      <div className="text-[8px] font-mono text-zinc-500">
                        IN: {data.punch_in_time}{data.punch_out_time ? ` · OUT: ${data.punch_out_time}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-sm font-bold font-sans text-white uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-5 h-5 text-red-500 animate-pulse" />
                GPS Location History
              </h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Live positions from staff devices. Use the export below to download full movement history.
              </p>
            </div>

            <button
              onClick={() => {
                setIsLoadingGps(true);
                refreshLiveData();
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 hover:shadow-red-500/10 shadow-md text-white font-bold font-mono text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              REFRESH
            </button>
          </div>

          {/* Export full movement history by date range */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Download Full Movement History (CSV)</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">From</span>
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1.5 font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">To</span>
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1.5 font-mono" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Employee</span>
                <select value={exportUserId} onChange={e => setExportUserId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-lg px-2 py-1.5 font-mono">
                  <option value="">All employees</option>
                  {employees.map(e => <option key={e.id} value={e.dbId ?? ''}>{e.name}</option>)}
                </select>
              </div>
              <a
                href={apiService.getLocationLogsExportUrl({ from: exportFrom, to: exportTo, user_id: exportUserId ? Number(exportUserId) : undefined })}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono rounded-lg transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[10px] text-zinc-500 font-bold font-mono uppercase block">
                Current live positions ({gpsLogs.length})
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

    </div>
  );
}
