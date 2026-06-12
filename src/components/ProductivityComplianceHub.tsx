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
  Compass
} from 'lucide-react';
import { Employee } from '../types';
import { apiService } from '../services/api';

interface ProductivityComplianceHubProps {
  employees: Employee[];
  onTriggerAlert?: (detail: string, cameraName: string, status: 'critical' | 'warning' | 'info') => void;
}

// Simulated GPS path coordinates for employees wandering offsite 
// (relative to Bengaluru HQ coordinates: lat 12.9716, lng 77.5946)
const EMPLOYEE_GPS_PATHS: Record<string, { lat: number; lng: number; label: string; details: string }[]> = {
  'EMP001': [
    { lat: 12.9716, lng: 77.5946, label: 'Main Entrance HQ', details: 'Within 500m geofence' },
    { lat: 12.9718, lng: 77.5950, label: 'Block A Cafeteria', details: 'Within 500m geofence' },
  ],
  'EMP002': [
    { lat: 12.9710, lng: 77.5940, label: 'Block B Courtyard', details: 'Within corporate campus' },
    { lat: 12.9695, lng: 77.5930, label: 'Offsite: Richmond Road', details: 'Traveled 0.8 km offsite' },
    { lat: 12.9680, lng: 77.5910, label: 'Offsite: MG Road Café', details: 'Traveled 2.1 km offsite' },
  ],
  'EMP003': [
    { lat: 12.9716, lng: 77.5946, label: 'Boardroom HQ', details: 'Operations desk' },
  ],
  'EMP005': [
    { lat: 12.9730, lng: 77.5980, label: 'Offsite: Kasturba Road', details: 'Traveled 1.4 km offsite' },
    { lat: 12.9750, lng: 77.6010, label: 'Offsite: Cubbon Park Gate', details: 'Traveled 3.2 km offsite' },
  ],
  'EMP006': [
    { lat: 12.9650, lng: 77.5850, label: 'Offsite: Residency Crossing', details: 'Traveled 4.5 km offsite' },
  ]
};

// Static MDM configuration and whitelist
const FORBIDDEN_APPS = [
  { pkg: 'com.whatsapp', name: 'WhatsApp', risk: 'High (Data Leak Risk)' },
  { pkg: 'com.instagram.android', name: 'Instagram', risk: 'Medium (Time Wastage)' },
  { pkg: 'com.supercell.clashofclans', name: 'Clash of Clans', risk: 'Medium (Distraction)' },
  { pkg: 'com.fakegps.spoofer', name: 'FakeGPS Hacktool', risk: 'Critical (Spoofing Alert)' }
];

export default function ProductivityComplianceHub({ employees, onTriggerAlert }: ProductivityComplianceHubProps) {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'ai_cameras' | 'excel_export' | 'gps_history'>('tracker');
  
  // Search parameters
  const [searchQuery, setSearchQuery] = useState('');
  
  // Simulated State for custom telemetry, preserved in session/local state
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
  }>>({
    'EMP001': {
      walkedKm: 0.15,
      offsiteMinutes: 0,
      currentApp: 'Evron Watchtower',
      isAppViolating: false,
      networkType: 'wifi',
      wifiSsid: 'EVRON-SECURE-WIFI',
      isSsidViolating: false,
      isWearingUniform: true,
      uniformComplianceRate: 98,
      securityAlertCount: 0,
      activeLat: 12.9716,
      activeLng: 77.5946,
      statusDetail: 'Stationary at Operations Center.',
      isDeveloperModeOn: false,
      wifiBypassedOrAirplaneMode: false
    },
    'EMP002': {
      walkedKm: 2.1,
      offsiteMinutes: 125,
      currentApp: 'WhatsApp',
      isAppViolating: true,
      networkType: 'cellular',
      wifiSsid: 'None (Mobile Data)',
      isSsidViolating: true,
      isWearingUniform: false, // Out of uniform!
      uniformComplianceRate: 65,
      securityAlertCount: 1,
      activeLat: 12.9680,
      activeLng: 77.5910,
      statusDetail: 'Left premises. Active forbidden app detected on corporate phone.',
      isDeveloperModeOn: false,
      wifiBypassedOrAirplaneMode: false
    },
    'EMP003': {
      walkedKm: 0.0,
      offsiteMinutes: 0,
      currentApp: 'Evron Watchtower',
      isAppViolating: false,
      networkType: 'wifi',
      wifiSsid: 'EVRON-SECURE-WIFI',
      isSsidViolating: false,
      isWearingUniform: true,
      uniformComplianceRate: 100,
      securityAlertCount: 0,
      activeLat: 12.9716,
      activeLng: 77.5946,
      statusDetail: 'Onsite. Security check approved.',
      isDeveloperModeOn: false,
      wifiBypassedOrAirplaneMode: false
    },
    'EMP004': {
      walkedKm: 1.25,
      offsiteMinutes: 10,
      currentApp: 'Evron Watchtower',
      isAppViolating: false,
      networkType: 'wifi',
      wifiSsid: 'EVRON-SECURE-WIFI',
      isSsidViolating: false,
      isWearingUniform: true,
      uniformComplianceRate: 100,
      securityAlertCount: 0,
      activeLat: 12.9718,
      activeLng: 77.5950,
      statusDetail: 'Onsite patrol track complete.',
      isDeveloperModeOn: false,
      wifiBypassedOrAirplaneMode: false
    },
    'EMP005': {
      walkedKm: 3.2,
      offsiteMinutes: 180,
      currentApp: 'Instagram',
      isAppViolating: true,
      networkType: 'cellular',
      wifiSsid: 'None (Mobile Data)',
      isSsidViolating: true,
      isWearingUniform: false,
      uniformComplianceRate: 40,
      securityAlertCount: 2,
      activeLat: 12.9750,
      activeLng: 77.6010,
      statusDetail: 'Extended offsite break. Roster alarm triggered.',
      isDeveloperModeOn: true,
      wifiBypassedOrAirplaneMode: false
    },
    'EMP006': {
      walkedKm: 4.5,
      offsiteMinutes: 210,
      currentApp: 'Clash of Clans',
      isAppViolating: true,
      networkType: 'cellular',
      wifiSsid: 'None (Mobile Data)',
      isSsidViolating: true,
      isWearingUniform: true,
      uniformComplianceRate: 85,
      securityAlertCount: 1,
      activeLat: 12.9650,
      activeLng: 77.5850,
      statusDetail: 'Absent field operations with game running.',
      isDeveloperModeOn: false,
      wifiBypassedOrAirplaneMode: true
    },
    'EMP007': {
      walkedKm: 0.3,
      offsiteMinutes: 0,
      currentApp: 'Evron Watchtower',
      isAppViolating: false,
      networkType: 'wifi',
      wifiSsid: 'EVRON-SECURE-WIFI',
      isSsidViolating: false,
      isWearingUniform: true,
      uniformComplianceRate: 99,
      securityAlertCount: 0,
      activeLat: 12.9716,
      activeLng: 77.5946,
      statusDetail: 'Onsite at workstation.',
      isDeveloperModeOn: false,
      wifiBypassedOrAirplaneMode: false
    },
    'EMP008': {
      walkedKm: 0.8,
      offsiteMinutes: 25,
      currentApp: 'FakeGPS Hacktool',
      isAppViolating: true,
      networkType: 'cellular',
      wifiSsid: 'None (Mobile Data)',
      isSsidViolating: true,
      isWearingUniform: true,
      uniformComplianceRate: 90,
      securityAlertCount: 3,
      activeLat: 12.9710,
      activeLng: 77.5940,
      statusDetail: 'Critical Alarm! Location spoofing tools verified.',
      isDeveloperModeOn: true,
      wifiBypassedOrAirplaneMode: true
    }
  });

  // Real or simulated GPS Logs list for backend persistence
  const [gpsLogs, setGpsLogs] = useState<any[]>([]);
  const [isLoadingGps, setIsLoadingGps] = useState<boolean>(true);

  // Sync to backend or local database state
  useEffect(() => {
    async function initGpsData() {
      setIsLoadingGps(true);
      try {
        const liveStates = await apiService.getGpsStates();
        if (liveStates && Object.keys(liveStates).length > 0) {
          setEmployeeStates(liveStates);
        }
        const liveLogs = await apiService.getGpsLogs();
        setGpsLogs(liveLogs);
      } catch (err) {
        console.warn('Failed to pull backend GPS log layers:', err);
      } finally {
        setIsLoadingGps(false);
      }
    }
    initGpsData();
  }, []);

  // Selected employee on map
  const [selectedEmpId, setSelectedEmpId] = useState<string>('EMP002');

  // Geofence administrator variables
  const [geofenceCenter, setGeofenceCenter] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });
  const [geofenceRadius, setGeofenceRadius] = useState<number>(300); // 300 meters by default
  const [isDefiningGeofence, setIsDefiningGeofence] = useState<boolean>(false);
  const [notifiedBreaches, setNotifiedBreaches] = useState<Record<string, 'inside' | 'outside'>>({});

  const geofenceCenterRef = useRef(geofenceCenter);
  const geofenceRadiusRef = useRef(geofenceRadius);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    geofenceCenterRef.current = geofenceCenter;
  }, [geofenceCenter]);

  useEffect(() => {
    geofenceRadiusRef.current = geofenceRadius;
  }, [geofenceRadius]);

  const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const latDiffMeters = (lat1 - lat2) * 111320;
    const lngDiffMeters = (lng1 - lng2) * 108000;
    return Math.sqrt(latDiffMeters * latDiffMeters + lngDiffMeters * lngDiffMeters);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDefiningGeofence || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Convert click coordinates to percentages (0 to 100)
    const pctX = (clickX / rect.width) * 100;
    const pctY = (clickY / rect.height) * 100;
    
    // Convert percentages back to lat/lng
    const clickedLng = 77.5946 + (pctX - 50) / 10000;
    const clickedLat = 12.9716 + (50 - pctY) / 10000;
    
    const newCenter = { lat: clickedLat, lng: clickedLng };
    setGeofenceCenter(newCenter);
    setIsDefiningGeofence(false); // finish setting on single click
    
    // Log/trigger notice
    triggerOuterSystemAlert(
      `Administrating Geofence: Custom circular perimeter center updated to [${clickedLat.toFixed(5)}, ${clickedLng.toFixed(5)}].`,
      "PERIMETER CONTROL ROOM",
      "info"
    );

    // Run custom checker
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
      
      triggerOuterSystemAlert(msg, "GEOFENCE RADAR CHASSIS", "critical");

      if (addCctvAlert) {
        const timestamp = new Date().toLocaleTimeString();
        setCameraAlertsList(prev => {
          const alertId = `GEO-B-${Date.now()}-${empId}`;
          if (prev.some(a => a.id === alertId)) return prev;
          return [
            {
              id: alertId,
              timestamp,
              camera: '🛰️ Watchtower Geofence Satellite Radar',
              type: 'Boundary Perimeter Breach',
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
        statusDetail: `GEOFENCE BREACH: Worker found outside the allowed perimeter bounds (${distance.toFixed(0)}m away).`
      };

    } else if (!isCurrentlyOutside && cachedState === 'outside') {
      // Returned inside
      setNotifiedBreaches(prev => ({ ...prev, [empId]: 'inside' }));
      
      const msg = `[GEOFENCE SECURED] Worker ${emp.name} (${empId}) returned inside the secure geofence boundaries.`;
      triggerOuterSystemAlert(msg, "GEOFENCE RADAR CHASSIS", "info");

      if (addCctvAlert) {
        const timestamp = new Date().toLocaleTimeString();
        setCameraAlertsList(prev => {
          const alertId = `GEO-G-${Date.now()}-${empId}`;
          if (prev.some(a => a.id === alertId)) return prev;
          return [
            {
              id: alertId,
              timestamp,
              camera: '🛰️ Watchtower Geofence Satellite Radar',
              type: 'Perimeter Boundary Cleared',
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
          triggerOuterSystemAlert(msg, "GEOFENCE RADAR CHASSIS", "critical");

          const timestamp = new Date().toLocaleTimeString();
          setCameraAlertsList(cPrev => {
            const alertId = `GEO-B-${Date.now()}-${empId}`;
            if (cPrev.some(a => a.id === alertId)) return cPrev;
            return [
              {
                id: alertId,
                timestamp,
                camera: '🛰️ Watchtower Geofence Satellite Radar',
                type: 'Boundary Perimeter Breach',
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
            statusDetail: `GEOFENCE BREACH: Worker found outside the allowed perimeter bounds (${distance.toFixed(0)}m away).`
          };
          changed = true;

        } else if (!isCurrentlyOutside && cachedState === 'outside') {
          setNotifiedBreaches(p => ({ ...p, [empId]: 'inside' }));
          const msg = `[GEOFENCE SECURED] Worker ${emp.name} (${empId}) returned inside the secure geofence boundaries.`;
          triggerOuterSystemAlert(msg, "GEOFENCE RADAR CHASSIS", "info");

          const timestamp = new Date().toLocaleTimeString();
          setCameraAlertsList(cPrev => {
            const alertId = `GEO-G-${Date.now()}-${empId}`;
            if (cPrev.some(a => a.id === alertId)) return cPrev;
            return [
              {
                id: alertId,
                timestamp,
                camera: '🛰️ Watchtower Geofence Satellite Radar',
                type: 'Perimeter Boundary Cleared',
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
  
  // Custom camera trigger states
  const [cameraAlertsList, setCameraAlertsList] = useState<Array<{
    id: string;
    timestamp: string;
    camera: string;
    type: string;
    detail: string;
    severity: 'critical' | 'warning' | 'info';
    subject: string;
    isCleared: boolean;
  }>>([
    {
      id: 'CAM-A1',
      timestamp: '19:10:45',
      camera: 'CAM-02 (Precious Gold Zone)',
      type: 'Theft / Unauthorized Hand Reach',
      detail: 'Hand boundary crossed with no biometric badge authorization on gold quality station.',
      severity: 'critical',
      subject: 'Michael Chen (EMP002)',
      isCleared: false
    },
    {
      id: 'CAM-A2',
      timestamp: '18:55:12',
      camera: 'CAM-05 (Block B Corridor)',
      type: 'Littering Detected',
      detail: 'Object discarded on walking path corridor. Cleanup alert pushed to facility management.',
      severity: 'warning',
      subject: 'Amara Okafor (EMP003)',
      isCleared: false
    },
    {
      id: 'CAM-A3',
      timestamp: '18:12:00',
      camera: 'CAM-01 (Mobby Lobby)',
      type: 'Uniform Compliance Alert',
      detail: 'Employee detected inside high security gold desk without official uniform jacket.',
      severity: 'warning',
      subject: 'Emma Watson (EMP005)',
      isCleared: false
    }
  ]);

  // Map Animation simulation
  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate small kilometer increases and coordinate shifts for offsite employees
      setEmployeeStates(prev => {
        const next = { ...prev };
        
        // EMP002 wanders on Richmond Road
        if (next['EMP002']) {
          const shift = (Math.random() - 0.5) * 0.0002;
          const newLat = parseFloat((next['EMP002'].activeLat + shift).toFixed(5));
          const newLng = parseFloat((next['EMP002'].activeLng + shift).toFixed(5));
          next['EMP002'] = {
            ...next['EMP002'],
            walkedKm: parseFloat((next['EMP002'].walkedKm + 0.02).toFixed(2)),
            offsiteMinutes: next['EMP002'].offsiteMinutes + 1,
            activeLat: newLat,
            activeLng: newLng,
          };
          
          // Check geofence crossing triggers
          const updates = checkEmployeeGeofence('EMP002', newLat, newLng, prev);
          if (updates) {
            next['EMP002'] = { ...next['EMP002'], ...updates };
          }
        }

        // EMP005 wanders near Park
        if (next['EMP005']) {
          const shift = (Math.random() - 0.5) * 0.0003;
          const newLat = parseFloat((next['EMP005'].activeLat + shift).toFixed(5));
          const newLng = parseFloat((next['EMP005'].activeLng + shift).toFixed(5));
          next['EMP005'] = {
            ...next['EMP005'],
            walkedKm: parseFloat((next['EMP005'].walkedKm + 0.03).toFixed(2)),
            offsiteMinutes: next['EMP005'].offsiteMinutes + 1,
            activeLat: newLat,
            activeLng: newLng,
          };

          // Check geofence crossing triggers
          const updates = checkEmployeeGeofence('EMP005', newLat, newLng, prev);
          if (updates) {
            next['EMP005'] = { ...next['EMP005'], ...updates };
          }
        }

        return next;
      });
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Sync to outer system dashboard alert system
  const triggerOuterSystemAlert = (detail: string, cameraName: string, status: 'critical' | 'warning' | 'info') => {
    if (onTriggerAlert) {
      onTriggerAlert(detail, cameraName, status);
    }
  };

  // Actions for the AI camera simulations
  const handleSimulateTheft = () => {
    const newId = `CAM-T-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();
    const newAlert = {
      id: newId,
      timestamp,
      camera: 'CAM-02 (Precious Gold Zone)',
      type: 'THEFT / SECURED MATERIAL ALARM',
      detail: 'CRITICAL ALERT: Physical touch grab flag verified by AI camera scanner. Immediate lockdown requested!',
      severity: 'critical' as const,
      subject: 'Carlos Mendez (EMP008)',
      isCleared: false
    };

    setCameraAlertsList(prev => [newAlert, ...prev]);
    triggerOuterSystemAlert(
      'AI CAM-02: Secure gold quality touch grab detected inside secure 5x5ft cage! Lockdown triggered.',
      'Precious Gold Zone CAM-02',
      'critical'
    );
  };

  const handleSimulateLittering = () => {
    const newId = `CAM-L-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();
    const newAlert = {
      id: newId,
      timestamp,
      camera: 'CAM-05 (Block B Corridor)',
      type: 'Premises Cleanliness Littering Alert',
      detail: 'Facility Rule Violation: Food wrapper littering caught on hallway floor.',
      severity: 'warning' as const,
      subject: 'Michael Chen (EMP002)',
      isCleared: false
    };

    setCameraAlertsList(prev => [newAlert, ...prev]);
    
    // Update local employee list alert stats
    setEmployeeStates(prev => ({
      ...prev,
      'EMP002': {
        ...prev['EMP002'],
        securityAlertCount: prev['EMP002'].securityAlertCount + 1
      }
    }));

    triggerOuterSystemAlert(
      'AI CAM-05: Hallway littering behavior caught on Block B premises. Dispatching cleaning bot.',
      'Block B Corridor CAM-05',
      'warning'
    );
  };

  const handleSimulateUniformViolation = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const newId = `CAM-U-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString();
    const newAlert = {
      id: newId,
      timestamp,
      camera: 'CAM-01 (Mobby Lobby)',
      type: 'Corporate Uniform Inspection Failure',
      detail: `Employee is not wearing the designated office uniform. Compliance rate dropped.`,
      severity: 'warning' as const,
      subject: `${emp.name} (${emp.id})`,
      isCleared: false
    };

    setCameraAlertsList(prev => [newAlert, ...prev]);

    // Update uniform compliance state for that user
    setEmployeeStates(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        isWearingUniform: false,
        uniformComplianceRate: Math.max(15, prev[empId].uniformComplianceRate - 15)
      }
    }));

    triggerOuterSystemAlert(
      `AI CAM-01: Uniform non-compliance flagged on ${emp.name}. Action summary dispatch queued.`,
      'Main Lobby CAM-01',
      'warning'
    );
  };

  const handleSimulateAppViolation = (empId: string, appName: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    // Trigger alert
    setEmployeeStates(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        currentApp: appName,
        isAppViolating: true,
        securityAlertCount: prev[empId].securityAlertCount + 1
      }
    }));

    triggerOuterSystemAlert(
      `Enterprise MDM: ${emp.name} flagged for using forbidden application "${appName}" while on-duty.`,
      'Mobile MDM Shield',
      'warning'
    );
  };

  const handleToggleDeveloperMode = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    setEmployeeStates(prev => {
      const current = prev[empId];
      if (!current) return prev;
      const isNewDevMode = !current.isDeveloperModeOn;
      const updatedStatus = isNewDevMode 
        ? "Hard Lockdown: Android Developer Options / USB Debugging detected! Application is locked out and can't be turned on."
        : "Developer options disabled. App loaded and monitored.";

      if (isNewDevMode) {
        triggerOuterSystemAlert(
          `[CRITICAL BREACH] ${emp.name} turned on Android Developer Options & USB Debugging. The Evron Watchtower client has automatically lockdown-blocked startup to secure device parameters. App cannot be turned on!`,
          "SECURITY ATTESTATION STACK",
          "critical"
        );
      }

      return {
        ...prev,
        [empId]: {
          ...current,
          isDeveloperModeOn: isNewDevMode,
          statusDetail: updatedStatus,
          securityAlertCount: isNewDevMode ? current.securityAlertCount + 1 : current.securityAlertCount
        }
      };
    });
  };

  const handleToggleAirplaneEvasion = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    setEmployeeStates(prev => {
      const current = prev[empId];
      if (!current) return prev;
      const isNewEvasion = !current.wifiBypassedOrAirplaneMode;
      const updatedStatus = isNewEvasion 
        ? "ALARM: Evading Trace! Cellular disconnected / Airplane mode, but local WiFi SSID is reachable. Dodging call detected!"
        : "Network restored to secure corporate mode.";

      if (isNewEvasion) {
        triggerOuterSystemAlert(
          `[OFFLINE EVASION ALERT] ${emp.name} cut cellular internet or put phone in Airplane Mode to escape monitoring, but local corporate Wi-Fi beacons remain reachable on their device. Dodging call and escaping surveillance verified!`,
          "ESCORT CELLULAR SENTINEL",
          "critical"
        );
      }

      return {
        ...prev,
        [empId]: {
          ...current,
          wifiBypassedOrAirplaneMode: isNewEvasion,
          statusDetail: updatedStatus,
          securityAlertCount: isNewEvasion ? current.securityAlertCount + 1 : current.securityAlertCount
        }
      };
    });
  };

  const handleClearAlert = (id: string) => {
    setCameraAlertsList(prev => prev.map(a => a.id === id ? { ...a, isCleared: true } : a));
  };

  // Compile and trigger direct EXCEL file download inside user browser
  const handleExportExcel = () => {
    // Generate real CSV formatted data (fully matches EXCEL and spreadsheet applications)
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Employee ID,Employee Name,Department,Role,Status,Walked Kilometers (Total),Offsite Duration (Min),Active Foreground App,Active Network Interface,WiFi SSID,Uniform Status,Uniform Compliance Rate,Security Violations Count,Latitude,Longitude\n';
    
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

      const row = [
        emp.id,
        `"${emp.name.replace(/"/g, '""')}"`,
        `"${emp.department}"`,
        `"${emp.role}"`,
        emp.status,
        state.walkedKm,
        state.offsiteMinutes,
        state.currentApp,
        state.networkType,
        state.wifiSsid,
        state.isWearingUniform ? 'COMPLIANT' : 'VIOLATION/ALERTED',
        `${state.uniformComplianceRate}%`,
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

  // Fetch the track records of the selected employee
  const selectedEmpState = employeeStates[selectedEmpId] || {
    walkedKm: 0,
    offsiteMinutes: 0,
    currentApp: 'Offline',
    isAppViolating: false,
    networkType: 'cellular',
    wifiSsid: 'Disconnected',
    isSsidViolating: false,
    isWearingUniform: true,
    uniformComplianceRate: 100,
    securityAlertCount: 0,
    activeLat: 12.9716,
    activeLng: 77.5946,
    statusDetail: 'No data.'
  };

  const selectedEmployeeObj = employees.find(e => e.id === selectedEmpId) || employees[0];

  return (
    <div className="space-y-6" id="productivity-compliance-module-container">
      {/* Upper Module Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl flex items-center gap-2">
            <Compass className="w-8 h-8 text-red-500 animate-spin-slow" />
            Productivity & Compliance Hub
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            On-duty personnel roster streams, real-time uniform compliance audits, and corridor activity inspection.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center bg-zinc-950 p-1 border border-zinc-850 rounded-lg shrink-0" id="tabs-compliance-sub">
          <button
            onClick={() => setActiveSubTab('tracker')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'tracker' 
                ? 'bg-red-500 text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            GPS & App Guard
          </button>
          <button
            onClick={() => setActiveSubTab('ai_cameras')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ai_cameras' 
                ? 'bg-red-500 text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CameraIcon className="w-3.5 h-3.5 animate-pulse" />
            AI Compliance Feed
          </button>
          <button
            onClick={() => setActiveSubTab('excel_export')}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'excel_export' 
                ? 'bg-red-500 text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Roster Ledger Excel
          </button>
          <button
            onClick={() => {
              setActiveSubTab('gps_history');
              // trigger refresh of logs
              apiService.getGpsLogs().then(logs => setGpsLogs(logs));
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition rounded-md flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'gps_history' 
                ? 'bg-red-500 text-white' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            GPS Telemetry History
          </button>
        </div>
      </div>

      {activeSubTab === 'tracker' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="tracker-viewport-layout">
          {/* Left panel: Employee Roster select filter List */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between max-h-[680px] overflow-hidden" id="staff-select-card-compliance">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold font-mono tracking-wider text-red-500 uppercase">GPS Patrol Roster</span>
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
                                Dev Blkd
                              </span>
                            )}
                            {stateObj.wifiBypassedOrAirplaneMode && (
                              <span className="text-[7.5px] bg-amber-950/60 text-amber-400 border border-amber-900/55 px-1 rounded font-mono font-bold font-semibold uppercase">
                                Offline Evsd
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
              <span>GPS SYNC CLOCK</span>
              <span className="text-emerald-400 animate-pulse">● SECURED LINK ACTIVE</span>
            </div>
          </div>

          {/* Right panel: Active live telemetry details, GPS Visualizer, and Canvas Map */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* 1. Vector Mapping Engine (Canvas representation of Bengaluru area) */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative">
              <div className="p-3 bg-zinc-900 border-b border-zinc-800/80 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                <span className="flex items-center gap-1.5 font-bold uppercase text-red-500 animate-pulse">
                  <Activity className="w-3.5 h-3.5 text-red-500" />
                  Live GPS Geofence Mapping Node // Active: {selectedEmployeeObj?.name || 'Michael Chen'}
                </span>
                <span>Active Geofence Radar: <strong className="text-white">{geofenceRadius}m radius</strong></span>
              </div>

              {/* Visual simulated canvas area representing map */}
              <div 
                ref={mapRef}
                onClick={handleMapClick}
                className={`h-80 bg-zinc-950/90 relative flex items-center justify-center select-none overflow-hidden ${
                  isDefiningGeofence ? 'cursor-crosshair ring-2 ring-inset ring-red-500/50 bg-red-950/5' : ''
                }`} 
                id="simulated-geofence-map shadow-inner"
              >
                {/* Geofence Grid Pattern */}
                <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
                
                {/* Active Custom Defined Administrator Geofence Circle Overlay */}
                {(() => {
                  const gfLatDelta = (geofenceCenter.lat - 12.9716);
                  const gfLngDelta = (geofenceCenter.lng - 77.5946);
                  const gfVisualTop = 50 - (gfLatDelta * 10000);
                  const gfVisualLeft = 50 + (gfLngDelta * 10000);
                  const diameterPct = (geofenceRadius * 2) / 11.13;

                  return (
                    <div 
                      className="absolute border border-dashed border-red-500/40 bg-red-500/5 rounded-full flex items-center justify-center animate-pulse-slow pointer-events-none transition-all duration-300"
                      style={{
                        top: `${gfVisualTop}%`,
                        left: `${gfVisualLeft}%`,
                        width: `${diameterPct}%`,
                        height: `${diameterPct}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <span className="text-[7px] text-red-500/70 font-mono tracking-widest absolute -top-5 bg-zinc-950/95 px-1 border border-red-900/40 rounded font-bold">
                        SECURE GEOPERIMETER ({geofenceRadius}M)
                      </span>
                    </div>
                  );
                })()}

                {/* HQ Center Pin Marker */}
                <div className="absolute flex flex-col items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white flex items-center justify-center shadow" />
                  <span className="text-[8px] bg-red-950 border border-red-500/60 text-white px-2 py-0.5 rounded font-mono font-bold mt-1 shadow-md">
                    EVRON BEN HQ
                  </span>
                </div>

                {/* Selected Employee Live Node */}
                {(() => {
                  const latestCoord = {
                    lat: selectedEmpState.activeLat,
                    lng: selectedEmpState.activeLng
                  };
                  
                  // Calculate distance from center
                  const distance = getDistanceInMeters(
                    latestCoord.lat,
                    latestCoord.lng,
                    geofenceCenter.lat,
                    geofenceCenter.lng
                  );

                  const isOffsite = distance > geofenceRadius;
                  
                  // Calculate mock visual positioning offsets relative to center
                  // Scale: 0.001 units = ~30px
                  const latDelta = (latestCoord.lat - 12.9716);
                  const lngDelta = (latestCoord.lng - 77.5946);
                  
                  const visualTop = 50 - (latDelta * 10000); 
                  const visualLeft = 50 + (lngDelta * 10000);

                  return (
                    <div 
                      className="absolute flex flex-col items-center transition-all duration-1000"
                      style={{ 
                        top: `${Math.max(10, Math.min(85, visualTop))}%`, 
                        left: `${Math.max(10, Math.min(85, visualLeft))}%` 
                      }}
                    >
                      <div className="relative">
                        {/* Radial Ping pulse indicator */}
                        <span className={`absolute -inset-2.5 rounded-full animate-ping ${isOffsite ? 'bg-amber-500/40' : 'bg-emerald-500/40'}`} />
                        <div className={`w-4 h-4 rounded-full border-2 border-zinc-950 flex items-center justify-center ${isOffsite ? 'bg-amber-500' : 'bg-emerald-500'} shadow`}>
                          <MapPin className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      
                      <div className="bg-zinc-950/95 border border-zinc-700/80 p-2 rounded shadow-xl mt-2 tracking-tight flex flex-col items-center leading-normal text-center shrink-0 min-w-[145px] z-10">
                        <span className="text-[9px] font-bold text-white">{selectedEmployeeObj?.name}</span>
                        <span className="text-[8px] text-zinc-400 font-mono">
                          {latestCoord.lat.toFixed(5)}, {latestCoord.lng.toFixed(5)}
                        </span>
                        <span className={`text-[7px] font-mono font-bold uppercase mt-1 px-1 py-0.5 rounded ${
                          isOffsite 
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {isOffsite ? `⚠️ BREACHED (${distance.toFixed(0)}m)` : `🎯 SECURE (${distance.toFixed(0)}m)`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Interactive Mode Information Message */}
                {isDefiningGeofence && (
                  <div className="absolute top-4 left-4 right-4 bg-red-950 border border-red-500 text-white p-2.5 rounded-lg text-center font-mono text-[9px] uppercase tracking-wider animate-pulse font-bold shadow-xl z-20">
                    🎯 Interactive Drawing Mode Active: Click anywhere on the map grid to lock geofence center point coordinate!
                  </div>
                )}

                {/* Watermark indicators */}
                <div className="absolute bottom-3 left-4 text-[9px] font-mono text-zinc-500 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-red-500" />
                  <span>GPS FEED: STACK REFRESH RATE 10 Sec</span>
                </div>
              </div>

              {/* Geofence Administrator Custom Config Panel */}
              <div className="border-t border-zinc-850 p-4 bg-zinc-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold font-mono text-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-red-500" />
                      Geofence Boundary Controller Admin Panel
                    </h4>
                    <p className="text-[9px] text-zinc-500">
                      Configure circular zones and test worker boundary crosses via direct visual simulation.
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
                    {isDefiningGeofence ? 'Cancel Defining' : '🎯 Click Map to Plot Center'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column Controllers */}
                  <div className="space-y-3">
                    {/* Radius Slider Tool */}
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase font-black">Configure Fence Limit Radius</span>
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
                            "PERIMETER CONTROL ROOM",
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

                  {/* Right Column Core Stress Simulating Teleporters */}
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-lg space-y-2">
                      <span className="text-[8px] font-mono text-zinc-500 uppercase font-black block">Active Worker Simulation Controller</span>
                      
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
                              <span className="text-zinc-400">Node Distance:</span>
                              <strong className={`font-mono ${isBreached ? 'text-amber-400 font-bold' : 'text-emerald-400 font-semibold'}`}>
                                {dist.toFixed(0)}m / {geofenceRadius}m limit
                              </strong>
                            </div>

                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-zinc-500">Boundary State:</span>
                              <span className={`font-mono uppercase font-black text-[9px] px-1 rounded ${
                                isBreached 
                                  ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20 animate-pulse' 
                                  : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                              }`}>
                                {isBreached ? '🚨 Outside Allowed Boundary' : '🟢 Inside Secure Boundary'}
                              </span>
                            </div>

                            {/* Simulation buttons to trigger breach instantly for testing */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-900">
                              <button
                                onClick={() => {
                                  // Displace selected employee OUTSIDE the custom geofence center
                                  const outsideLat = parseFloat((geofenceCenter.lat + (geofenceRadius + 150) / 111320).toFixed(5));
                                  const outsideLng = parseFloat((geofenceCenter.lng + (geofenceRadius + 150) / 108000).toFixed(5));
                                  
                                  setEmployeeStates(prev => {
                                    const current = prev[selectedEmpId];
                                    if (!current) return prev;
                                    const nextState = {
                                      ...prev,
                                      [selectedEmpId]: {
                                        ...current,
                                        activeLat: outsideLat,
                                        activeLng: outsideLng,
                                        offsiteMinutes: current.offsiteMinutes + 12
                                      }
                                    };
                                    
                                    // Trigger immediate check
                                    const updates = checkEmployeeGeofence(selectedEmpId, outsideLat, outsideLng, prev);
                                    if (updates) {
                                      nextState[selectedEmpId] = { ...nextState[selectedEmpId], ...updates };
                                    }
                                    
                                    // Sync to backend persistent DB
                                    const empObj = employees.find(e => e.id === selectedEmpId);
                                    apiService.reportGpsLog({
                                      employeeId: selectedEmpId,
                                      employeeName: empObj?.name,
                                      avatar: empObj?.avatar,
                                      lat: outsideLat,
                                      lng: outsideLng,
                                      accuracy: 15,
                                      status: 'Present',
                                      currentApp: current.currentApp,
                                      isAppViolating: current.isAppViolating,
                                      networkType: current.networkType,
                                      wifiSsid: current.wifiSsid,
                                      isSsidViolating: current.isSsidViolating,
                                      isWearingUniform: current.isWearingUniform,
                                      statusDetail: 'Critical Boundary Exit: Simulating off-premises wander.',
                                      isDeveloperModeOn: current.isDeveloperModeOn,
                                      wifiBypassedOrAirplaneMode: current.wifiBypassedOrAirplaneMode
                                    }).then(() => {
                                      apiService.getGpsLogs().then(logs => setGpsLogs(logs));
                                    });

                                    return nextState;
                                  });
                                }}
                                className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-amber-500 hover:text-white transition rounded text-[9px] font-mono uppercase font-bold cursor-pointer animate-none"
                              >
                                Sim Boundary Exit
                              </button>

                              <button
                                onClick={() => {
                                  // Move selected employee INSTANTLY inside the geofence center
                                  const insideLat = geofenceCenter.lat;
                                  const insideLng = geofenceCenter.lng;

                                  setEmployeeStates(prev => {
                                    const current = prev[selectedEmpId];
                                    if (!current) return prev;
                                    const nextState = {
                                      ...prev,
                                      [selectedEmpId]: {
                                        ...current,
                                        activeLat: insideLat,
                                        activeLng: insideLng,
                                        offsiteMinutes: 0
                                      }
                                    };
                                    
                                    // Trigger immediate check
                                    const updates = checkEmployeeGeofence(selectedEmpId, insideLat, insideLng, prev);
                                    if (updates) {
                                      nextState[selectedEmpId] = { ...nextState[selectedEmpId], ...updates };
                                    }

                                    // Sync to backend persistent DB
                                    const empObj = employees.find(e => e.id === selectedEmpId);
                                    apiService.reportGpsLog({
                                      employeeId: selectedEmpId,
                                      employeeName: empObj?.name,
                                      avatar: empObj?.avatar,
                                      lat: insideLat,
                                      lng: insideLng,
                                      accuracy: 5,
                                      status: 'Present',
                                      currentApp: 'Evron Watchtower',
                                      isAppViolating: false,
                                      networkType: 'wifi',
                                      wifiSsid: 'EVRON-SECURE-WIFI',
                                      isSsidViolating: false,
                                      isWearingUniform: true,
                                      statusDetail: 'Teleported to secure HQ perimeter center.',
                                      isDeveloperModeOn: false,
                                      wifiBypassedOrAirplaneMode: false
                                    }).then(() => {
                                      apiService.getGpsLogs().then(logs => setGpsLogs(logs));
                                    });
                                    
                                    return nextState;
                                  });
                                }}
                                className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-emerald-400 hover:text-white transition rounded text-[9px] font-mono uppercase font-bold cursor-pointer"
                              >
                                Teleport to HQ Center
                              </button>
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
              {/* MDM Blocklist & Developer Options Lockout */}
              <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-rose-500" />
                    <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">MDM & Developer Guard</h3>
                  </div>
                  <span className="text-[8px] bg-red-950 font-mono text-red-400 border border-red-900/40 px-1 py-0.2 rounded font-bold uppercase">
                    Anti-Attestation v2
                  </span>
                </div>

                <div className="space-y-3">
                  {/* APP LOCKOUT STATE INDICATOR */}
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-500 font-mono uppercase block">Attestation Status</span>
                      {selectedEmpState.isDeveloperModeOn ? (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          🚫 APP STARTUP LOCKED
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          🟢 ACTIVE / MONITORED
                        </span>
                      )}
                    </div>

                    {selectedEmpState.isDeveloperModeOn ? (
                      <div className="bg-red-950/20 border border-red-900/20 p-2.5 rounded text-[10px] leading-relaxed text-red-400 font-sans">
                        <strong>Developer Mode Detected on Client!</strong> The client's device has USB Debugging or Developer Options enabled. For security compliance, the <strong>Evron Watchtower App has shutdown and is blocked from starting</strong>. Access is completely denied.
                      </div>
                    ) : (
                      <div className="bg-emerald-950/20 border border-emerald-900/20 p-2.5 rounded text-[10px] leading-relaxed text-zinc-400 font-sans">
                        Device parameters are clean. Android Developer Options are toggled OFF. Secure on-duty tracking telemetry is transferring normally.
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-550 font-mono uppercase block">FOREGROUND APP PROCESS</span>
                      <strong className={`text-xs font-mono mb-1 block ${selectedEmpState.isAppViolating ? 'text-rose-400' : 'text-zinc-200'}`}>
                        {selectedEmpState.isDeveloperModeOn ? 'None (Blocked by Security)' : selectedEmpState.currentApp}
                      </strong>
                    </div>

                    {selectedEmpState.isAppViolating ? (
                      <span className="bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase animate-pulse">
                        ⚠️ VIOLATION
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase">
                        ✅ SAFE APP
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Wi-Fi SSID & Airplane Evasion Detection Sentinel */}
              <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">Wi-Fi & Airplane Evasion Sentinel</h3>
                  </div>
                  <span className="text-[8px] bg-emerald-950 font-mono text-emerald-400 border border-emerald-900/40 px-1 py-0.2 rounded font-bold uppercase">
                    WiFi Radar v1.5
                  </span>
                </div>

                <div className="space-y-3">
                  {/* EVASION DETECTION BANNER */}
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-zinc-550 font-mono uppercase block">Surveillance Status</span>
                      {selectedEmpState.wifiBypassedOrAirplaneMode ? (
                        <span className="bg-red-550 border border-red-550 text-white text-[8px] font-mono px-2 py-0.5 rounded font-black uppercase animate-bounce flex items-center gap-1">
                          🚨 DODGING MONITORING
                        </span>
                      ) : (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                          🟢 SIGNAL SECURED
                        </span>
                      )}
                    </div>

                    {selectedEmpState.wifiBypassedOrAirplaneMode ? (
                      <div className="bg-red-950/30 border border-red-500/30 p-2.5 rounded text-[10px] leading-relaxed text-amber-300 font-sans">
                        <strong className="text-red-400 uppercase tracking-wide block mb-0.5 font-mono text-[9px]">⚠️ TRIPWIRE TRIP: EVASION VERIFIED</strong>
                        Worker has abruptly cut cellular network or enabled **Airplane Mode** to hide their GPS coordinates. However, corporate routers confirm their <strong>device is STILL currently logged into WiFi SSID EVRON-SECURE-WIFI</strong> in the facility range. Dodging monitoring has been securely flagged!
                      </div>
                    ) : (
                      <div className="bg-emerald-950/20 border border-emerald-900/20 p-2.5 rounded text-[10px] leading-relaxed text-zinc-450 font-sans">
                        No internet evasion signals found. General ping/acknowledgement sequence aligns with normal network data bands.
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-mono uppercase block">WIFI SSID / CARRIER GATEWAY</span>
                      <strong className={`text-xs font-mono ${selectedEmpState.wifiBypassedOrAirplaneMode ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                        {selectedEmpState.wifiBypassedOrAirplaneMode ? 'EVRON-SECURE-WIFI (Local Evasion Hook)' : selectedEmpState.wifiSsid}
                      </strong>
                    </div>

                    {selectedEmpState.wifiBypassedOrAirplaneMode ? (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                        🚨 COLD HEARTBEAT
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                        ✅ CONNECTED
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
                <h4 className="text-xs font-bold text-white uppercase font-sans">Patrol Details: {selectedEmployeeObj?.name}</h4>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  {selectedEmpState.statusDetail} (Cumulative Roster Alerts: <strong className="text-red-400">{selectedEmpState.securityAlertCount}</strong>)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'ai_cameras' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ai-cameras-workspace-frame">
          {/* Main Full-Width Panel: Incident monitor logs and active watch */}
          <div className="lg:col-span-12 bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between" id="surveillance-logs-checklist">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-4">
                <span className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-red-500" />
                  AI Camera Compliance Event Logs
                </span>
                <span className="text-[9px] text-red-500 font-mono font-bold animate-pulse">● LIVE INTERIM CLOCK</span>
              </div>

              <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1" id="live-camera-violation-threads">
                {cameraAlertsList.map(item => (
                  <div 
                    key={item.id} 
                    className={`p-3 rounded-lg border transition duration-150 relative ${
                      item.isCleared 
                        ? 'bg-zinc-950/20 border-zinc-900 opacity-50' 
                        : item.severity === 'critical'
                          ? 'bg-red-550/5 border-red-550/40'
                          : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    {/* Timestamp bubble */}
                    <span className="absolute right-3 top-3 text-[9px] font-mono text-zinc-500 font-semibold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
                      {item.timestamp}
                    </span>

                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                        item.isCleared ? 'text-zinc-500' : item.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        {item.type} {item.isCleared && '(CLEARED)'}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        Node: <strong className="text-white font-mono">{item.camera}</strong> · Subject: <strong className="text-white">{item.subject}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed font-sans">{item.detail}</p>
                    
                    {!item.isCleared && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => handleClearAlert(item.id)}
                          className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[8px] font-mono hover:text-white rounded hover:bg-zinc-900 cursor-pointer uppercase transition"
                        >
                          Clear alert signal
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {cameraAlertsList.length === 0 && (
                  <div className="py-20 text-center font-mono text-zinc-500 text-xs">
                    No camera warnings logged today. System secure.
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-850/60 rounded-lg text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 mt-4">
              <Sparkles className="w-4 h-4 text-red-500 shrink-0" />
              <span>CCTV system detects uniforms via deep neural mesh model and logs all breaches.</span>
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
                Live Database GPS Log Stream & Telemetry
              </h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Real-time satellite coordinates telemetry harvested dynamically from worker devices and active biometric checkins.
              </p>
            </div>
            
            <button
              onClick={async () => {
                try {
                  const logs = await apiService.getGpsLogs();
                  setGpsLogs(logs);
                } catch (err) {
                  console.error(err);
                }
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
                Logged Coordinate Layers ({gpsLogs.length} Records)
              </span>
              <span className="text-[9px] font-mono text-zinc-400">
                Data Backend Source: <strong className="text-emerald-400">JSON DB Endpoints Connected</strong>
              </span>
            </div>

            {isLoadingGps ? (
              <div className="py-20 text-center font-mono text-zinc-500 text-xs animate-pulse flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
                Querying Cloud Run Microservice Database Layers...
              </div>
            ) : gpsLogs.length === 0 ? (
              <div className="py-20 text-center font-mono border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs bg-zinc-950/40">
                🚨 No GPS telemetry points registered in the database yet. Update device hardware state or trigger Biometric punch cards.
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
              <h2 className="text-sm font-bold font-sans text-white">Full Personnel Productivity & Active Ledger</h2>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">Download CSV of the active personnel roster with location status, security counts, and duty logs.</p>
            </div>
            
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/20 shadow-md text-white font-bold font-mono text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD PERSONNEL CSV SHEET
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
