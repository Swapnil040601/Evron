/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  MapPin, 
  Cpu, 
  ShieldAlert, 
  Settings, 
  Minimize2, 
  Maximize2,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';

export interface DeviceHardwareState {
  gpsStatus: 'on' | 'off';
  developerMode: boolean;
  latitude: number;
  longitude: number;
  batteryLevel: number;
  internetTracking: 'on' | 'off';
  internetType: 'wifi' | 'cellular' | 'disconnected';
  wifiSsid: string;
  activeApp: string;
  kilometres: number;
  idleMinutes: number;
  imeiLocked: boolean;
  unauthorizedAppsInstalled: boolean;
}

export const getDeviceHardwareState = (): DeviceHardwareState => {
  if (typeof window === 'undefined') {
    return {
      gpsStatus: 'on',
      developerMode: false,
      latitude: 12.9716,
      longitude: 77.5946,
      batteryLevel: 84,
      internetTracking: 'on',
      internetType: 'wifi',
      wifiSsid: 'EVRON-SECURE-WIFI',
      activeApp: 'Evron Shield',
      kilometres: 8.2,
      idleMinutes: 14,
      imeiLocked: true,
      unauthorizedAppsInstalled: false
    };
  }
  
  const gps = localStorage.getItem('mock_device_gps_status') || 'on';
  const devMode = localStorage.getItem('mock_device_developer_mode') === 'true';
  const lat = parseFloat(localStorage.getItem('mock_device_lat') || '12.9716');
  const lng = parseFloat(localStorage.getItem('mock_device_lng') || '77.5946');
  const battery = parseInt(localStorage.getItem('mock_device_battery_level') || '84');
  const internet = (localStorage.getItem('mock_device_internet_tracking') || 'on') as 'on' | 'off';
  const internetType = (localStorage.getItem('mock_device_internet_type') || 'wifi') as 'wifi' | 'cellular' | 'disconnected';
  const wifiSsid = localStorage.getItem('mock_device_wifi_ssid') || 'EVRON-SECURE-WIFI';
  const activeApp = localStorage.getItem('mock_device_active_app') || 'Evron Shield';
  const kilometres = parseFloat(localStorage.getItem('mock_device_kilometres') || '8.2');
  const idle = parseInt(localStorage.getItem('mock_device_idle_minutes') || '14');
  const imeiLocked = localStorage.getItem('mock_device_imei_locked') !== 'false';
  const apps = localStorage.getItem('mock_device_unauthorized_apps') === 'true';

  return {
    gpsStatus: gps as 'on' | 'off',
    developerMode: devMode,
    latitude: lat,
    longitude: lng,
    batteryLevel: battery,
    internetTracking: internet,
    internetType,
    wifiSsid,
    activeApp,
    kilometres,
    idleMinutes: idle,
    imeiLocked,
    unauthorizedAppsInstalled: apps
  };
};

export const saveDeviceHardwareState = (state: DeviceHardwareState) => {
  localStorage.setItem('mock_device_gps_status', state.gpsStatus);
  localStorage.setItem('mock_device_developer_mode', state.developerMode ? 'true' : 'false');
  localStorage.setItem('mock_device_lat', state.latitude.toString());
  localStorage.setItem('mock_device_lng', state.longitude.toString());
  localStorage.setItem('mock_device_battery_level', state.batteryLevel.toString());
  localStorage.setItem('mock_device_internet_tracking', state.internetTracking);
  localStorage.setItem('mock_device_internet_type', state.internetType);
  localStorage.setItem('mock_device_wifi_ssid', state.wifiSsid);
  localStorage.setItem('mock_device_active_app', state.activeApp);
  localStorage.setItem('mock_device_kilometres', state.kilometres.toString());
  localStorage.setItem('mock_device_idle_minutes', state.idleMinutes.toString());
  localStorage.setItem('mock_device_imei_locked', state.imeiLocked ? 'true' : 'false');
  localStorage.setItem('mock_device_unauthorized_apps', state.unauthorizedAppsInstalled ? 'true' : 'false');
  
  // Dispatch a global event to keep other active windows/components reactive
  window.dispatchEvent(new Event('device-hardware-changed'));
};

export default function DeviceSimulator() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<DeviceHardwareState>(getDeviceHardwareState());
  const [actualCoords, setActualCoords] = useState<{lat: number, lng: number} | null>(null);
  const [geoApiState, setGeoApiState] = useState<'idle' | 'loading' | 'success' | 'denied'>('idle');

  useEffect(() => {
    setState(getDeviceHardwareState());

    const handleHardwareChange = () => {
      setState(getDeviceHardwareState());
    };

    window.addEventListener('device-hardware-changed', handleHardwareChange);
    return () => {
      window.removeEventListener('device-hardware-changed', handleHardwareChange);
    };
  }, []);

  const triggerStateUpdate = (updates: Partial<DeviceHardwareState>) => {
    const newState = { ...state, ...updates };
    setState(newState);
    saveDeviceHardwareState(newState);
  };

  const handleTestRealGps = () => {
    if (!navigator.geolocation) {
      setGeoApiState('denied');
      return;
    }

    setGeoApiState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setActualCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGeoApiState('success');
        // Update device mock coordinates with actual ones
        triggerStateUpdate({
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4))
        });
      },
      (err) => {
        console.warn('Geolocation API check rejected by browser settings:', err);
        setGeoApiState('denied');
      },
      { timeout: 5000 }
    );
  };

  return (
    <div className="fixed bottom-16 sm:bottom-4 right-4 z-50 font-mono text-[11px]" id="hardware-simulator-controller">
      {/* Tiny expander toggle */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl hover:border-red-500/40 transition-all cursor-pointer group"
          id="hardware-simulator-trigger-expand"
        >
          <Smartphone className="w-4 h-4 text-red-500 group-hover:animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-[10px]">VALUE-GOLD EMULATOR</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
        </button>
      ) : (
        <div 
          className="w-80 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-2xl overflow-hidden animate-fadeIn" 
          id="hardware-simulator-inspector-body"
        >
          {/* Header */}
          <div className="bg-zinc-900 px-4 py-2.5 flex items-center justify-between border-b border-zinc-800 select-none">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#ef4444]" />
              <span className="font-bold text-white uppercase tracking-wide text-[10px]">VALUEGOLD DEVICE LAB</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
              title="Collapse Panel"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Panel Parameters */}
          <div className="p-4 space-y-3.5 max-h-[460px] overflow-y-auto w-full flex flex-col">
            
            {/* Status overview list info */}
            <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 leading-tight text-[9.5px] font-sans flex flex-col gap-1.5 flex-shrink-0">
              <span>Dynamic simulator representing staff telemetry fields for secure Value Gold compliance policies.</span>
              <div className="flex flex-wrap gap-1 font-mono text-[8px] pt-1 border-t border-zinc-800">
                <span className="bg-red-950/40 text-red-400 px-1 py-0.5 rounded uppercase font-bold text-[8px]">Stare Detector: Active</span>
                <span className="bg-amber-950/40 text-amber-400 px-1 py-0.5 rounded uppercase font-bold text-[8px]">Gold Mon: CCTV Enabled</span>
              </div>
            </div>

            {/* Simulated GPS & Geofence Coordinates */}
            <div className="space-y-2 p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900 flex-shrink-0">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="font-bold uppercase tracking-wide text-[9.5px]">📍 GPS COORDS & GEOFENCING</span>
                <span className={`font-bold text-[8px] px-1.5 py-0.5 rounded ${
                  (state.latitude === 12.9716 && state.longitude === 77.5946) 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : (Math.abs(state.latitude - 12.9716) < 0.0045 && Math.abs(state.longitude - 77.5946) < 0.0045)
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400 animate-pulse'
                }`}>
                  {state.gpsStatus === 'off' ? 'GPS INACTIVE' : 
                   (Math.abs(state.latitude - 12.9716) < 0.0045 && Math.abs(state.longitude - 77.5946) < 0.0045) 
                     ? 'INSIDE OFFICE FENCE' : 'OUTSIDE OFFICE FENCE'}
                </span>
              </div>

              {/* Coordinates display & manual shift */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-black/40 p-1.5 rounded border border-zinc-850">
                  <span className="text-zinc-500 block text-[8px] uppercase">LATITUDE</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={state.latitude}
                    onChange={(e) => triggerStateUpdate({ latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent text-white font-mono focus:outline-none"
                  />
                </div>
                <div className="bg-black/40 p-1.5 rounded border border-zinc-850">
                  <span className="text-zinc-500 block text-[8px] uppercase">LONGITUDE</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={state.longitude}
                    onChange={(e) => triggerStateUpdate({ longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick teleports */}
              <div className="space-y-1 gallery-options">
                <span className="text-zinc-500 block text-[8px] uppercase font-bold">Teleport Coordinates:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => triggerStateUpdate({ latitude: 12.9716, longitude: 77.5946, gpsStatus: 'on' })}
                    className="flex-1 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-[8px] text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    Office HQ 
                  </button>
                  <button
                    onClick={() => triggerStateUpdate({ latitude: 12.9755, longitude: 77.5985, gpsStatus: 'on' })}
                    className="flex-1 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-[8px] text-[#eab308] hover:text-yellow-405 transition cursor-pointer font-bold"
                  >
                    HQ Fences
                  </button>
                  <button
                    onClick={() => triggerStateUpdate({ latitude: 13.0125, longitude: 77.6254, gpsStatus: 'on' })}
                    className="flex-1 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-[8px] text-red-500 hover:text-red-400 transition cursor-pointer font-bold"
                  >
                    Distant (Out)
                  </button>
                </div>
              </div>

              {/* Distance label */}
              <div className="bg-black/20 p-2 rounded text-[8.5px] text-zinc-400 font-mono flex items-center justify-between">
                <span>Distance from HQ:</span>
                <strong className="text-white">
                  {(Math.sqrt(Math.pow(state.latitude - 12.9716, 2) + Math.pow(state.longitude - 77.5946, 2)) * 111.3).toFixed(3)} km
                </strong>
              </div>
            </div>

            {/* Active App Foreground compliance */}
            <div className="space-y-1.5 p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900 flex-shrink-0">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="font-bold uppercase tracking-wide text-[9.5px]">📱 ACTIVE APP FOREGROUND</span>
                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                  state.activeApp === 'Evron Shield' ? 'bg-emerald-500/10 text-emerald-400' :
                  state.activeApp === 'WhatsApp' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400 animate-pulse'
                }`}>
                  {state.activeApp === 'Evron Shield' ? 'COMPLIANT' : 'VIOLATION'}
                </span>
              </div>
              <select
                value={state.activeApp}
                onChange={(e) => triggerStateUpdate({ activeApp: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-850 rounded p-1.5 text-xs text-white uppercase focus:outline-none"
              >
                <option value="Evron Shield">Evron Shield (Corporate Active)</option>
                <option value="WhatsApp">WhatsApp (Messenger Alert)</option>
                <option value="Instagram">Instagram (Forbidden Social)</option>
                <option value="Clash of Clans">Clash of Clans (Forbidden Gaming)</option>
                <option value="FakeGPS Spoofer">FakeGPS Spoofer (Spoof Tool)</option>
                <option value="Uber">Uber Transit (Deliveries)</option>
              </select>
            </div>

            {/* Network Connections: WiFi vs Cellular with Customizable SSID */}
            <div className="space-y-2 p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900 flex-shrink-0">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="font-bold uppercase tracking-wide text-[9.5px]">📶 ACTIVE NET CONX & SSID</span>
                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                  state.internetType === 'wifi' && state.wifiSsid === 'EVRON-SECURE-WIFI' ? 'bg-emerald-500/10 text-emerald-400' :
                  state.internetType === 'disconnected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {state.internetType === 'wifi' && state.wifiSsid === 'EVRON-SECURE-WIFI' ? 'SECURE WI-FI' : 
                   state.internetType === 'disconnected' ? 'DISCONNECTED' : 'CELLULAR (MOBILE DATA)'}
                </span>
              </div>
              
              <div className="flex gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => triggerStateUpdate({ internetType: 'wifi', internetTracking: 'on' })}
                  className={`flex-1 py-1 text-[8.5px] font-bold rounded transition border cursor-pointer ${
                    state.internetType === 'wifi' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  SECURE WI-FI
                </button>
                <button
                  type="button"
                  onClick={() => triggerStateUpdate({ internetType: 'cellular', internetTracking: 'on' })}
                  className={`flex-1 py-1 text-[8.5px] font-bold rounded transition border cursor-pointer ${
                    state.internetType === 'cellular' ? 'bg-amber-950/20 border-amber-500/30 text-amber-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  MOBILE DATA
                </button>
                <button
                  type="button"
                  onClick={() => triggerStateUpdate({ internetType: 'disconnected', internetTracking: 'off' })}
                  className={`flex-1 py-1 text-[8.5px] font-bold rounded transition border cursor-pointer ${
                    state.internetType === 'disconnected' ? 'bg-red-950/20 border-red-500/30 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  DISCONNECT
                </button>
              </div>

              {state.internetType === 'wifi' && (
                <div className="space-y-1">
                  <span className="text-zinc-500 block text-[8px] uppercase font-bold">WIFI SSID NETWORK:</span>
                  <select
                    value={state.wifiSsid}
                    onChange={(e) => triggerStateUpdate({ wifiSsid: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded p-1 text-[9.5px] text-zinc-300 font-mono focus:outline-none"
                  >
                    <option value="EVRON-SECURE-WIFI">EVRON-SECURE-WIFI (Compliant Corp IP)</option>
                    <option value="Home_Network_5G">Home_Network_5G (External ISP)</option>
                    <option value="Public_Free_SSID">Public_Free_SSID (Unsecured Unchecked)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Battery Level Control */}
            <div className="space-y-1 p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="font-bold uppercase tracking-wide text-[9.5px]">🔋 BATTERY POWER</span>
                <span className={`font-bold ${state.batteryLevel < 20 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                  {state.batteryLevel}% {state.batteryLevel < 20 ? '(CRITICAL)' : '(OK)'}
                </span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="100" 
                value={state.batteryLevel} 
                onChange={(e) => triggerStateUpdate({ batteryLevel: parseInt(e.target.value) })}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
            </div>

            {/* Kilometers and Idle Minutes Incrementor Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-zinc-900/30 rounded-xl border border-zinc-900 space-y-1">
                <span className="text-zinc-400 block text-[9px] uppercase font-bold text-center">DISTANCE TRAVELED</span>
                <div className="flex items-center justify-between bg-black/40 rounded p-1">
                  <button 
                    onClick={() => triggerStateUpdate({ kilometres: Math.max(0, Number((state.kilometres - 0.5).toFixed(1))) })}
                    className="w-5 h-5 bg-zinc-800 text-zinc-300 hover:text-white rounded font-bold"
                  >-</button>
                  <span className="text-[10px] font-bold text-white font-mono">{state.kilometres} km</span>
                  <button 
                    onClick={() => triggerStateUpdate({ kilometres: Number((state.kilometres + 0.5).toFixed(1)) })}
                    className="w-5 h-5 bg-zinc-800 text-zinc-300 hover:text-white rounded font-bold"
                  >+</button>
                </div>
              </div>

              <div className="p-2 bg-zinc-900/30 rounded-xl border border-zinc-900 space-y-1">
                <span className="text-zinc-400 block text-[9px] uppercase font-bold text-center">IDLE TIME (MINS)</span>
                <div className="flex items-center justify-between bg-black/40 rounded p-1">
                  <button 
                    onClick={() => triggerStateUpdate({ idleMinutes: Math.max(0, state.idleMinutes - 2) })}
                    className="w-5 h-5 bg-zinc-800 text-zinc-300 hover:text-white rounded font-bold"
                  >-</button>
                  <span className="text-[10px] font-bold text-white font-mono">{state.idleMinutes}m</span>
                  <button 
                    onClick={() => triggerStateUpdate({ idleMinutes: state.idleMinutes + 2 })}
                    className="w-5 h-5 bg-zinc-800 text-zinc-300 hover:text-white rounded font-bold"
                  >+</button>
                </div>
              </div>
            </div>

            {/* Simulated unauthorized background location tools */}
            <div className="space-y-1.5 p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900">
              <div className="flex items-center justify-between text-zinc-300">
                <span className="font-bold uppercase tracking-wide text-[9.5px]">🕹️ FORBIDDEN MOCK APPS</span>
                <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                  state.unauthorizedAppsInstalled ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {state.unauthorizedAppsInstalled ? '⚠️ SPOOF_FOUND' : 'CLEAN'}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => triggerStateUpdate({ unauthorizedAppsInstalled: true })}
                  className={`flex-1 py-1 text-[9px] font-semibold rounded text-center border transition ${
                    state.unauthorizedAppsInstalled ? 'bg-red-950/40 border-red-500/40 text-red-400' : 'bg-zinc-900 border-zinc-880 text-zinc-500'
                  }`}
                >
                  SIMULATE SPOOFER INT.
                </button>
                <button
                  onClick={() => triggerStateUpdate({ unauthorizedAppsInstalled: false })}
                  className={`flex-1 py-1 text-[9px] font-semibold rounded text-center border transition ${
                    !state.unauthorizedAppsInstalled ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-900 border-zinc-880 text-zinc-500'
                  }`}
                >
                  CLEAR DETECTS
                </button>
              </div>
            </div>

            {/* IMEI and IP binding locked status */}
            <div className="p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="block text-[9.5px] uppercase font-bold text-white">IMEI physical Lock</span>
                <span className="block text-[8px] font-mono text-zinc-500">BOUND: IMEI-358941091244510</span>
              </div>
              <button 
                onClick={() => triggerStateUpdate({ imeiLocked: !state.imeiLocked })}
                className={`px-2 py-1 text-[8.5px] font-black uppercase rounded ${
                  state.imeiLocked ? 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-400' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                }`}
              >
                {state.imeiLocked ? 'BOUND LOCKED' : 'UNLOCKED'}
              </button>
            </div>

            {/* GPS Switch */}
            <div className="space-y-1.5 p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wide text-[9.5px]">PHONE GPS STATE</span>
                <span className={`px-1 rounded text-[8px] font-bold ${
                  state.gpsStatus === 'on' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {state.gpsStatus === 'on' ? '● GPS ON' : '○ GPS OFF'}
                </span>
              </div>
              
              <div className="flex gap-1.5 pt-0.5">
                <button
                  onClick={() => triggerStateUpdate({ gpsStatus: 'on' })}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition border ${
                    state.gpsStatus === 'on' ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  ACTIVATE
                </button>
                <button
                  onClick={() => triggerStateUpdate({ gpsStatus: 'off' })}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition border ${
                    state.gpsStatus === 'off' ? 'bg-red-950/30 border-red-500/30 text-red-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  DEACTIVATE
                </button>
              </div>
            </div>

            {/* Developer options Switch */}
            <div className="space-y-1.5 p-2.5 bg-zinc-900/30 rounded-xl border border-zinc-900">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wide text-[9.5px]">DEVELOPER OPTIONS</span>
                <span className={`px-1 rounded text-[8px] font-bold ${
                  state.developerMode ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {state.developerMode ? '🚨 ACTIVE' : 'SECURE'}
                </span>
              </div>

              <div className="flex gap-1.5 pt-0.5">
                <button
                  onClick={() => triggerStateUpdate({ developerMode: false })}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition border ${
                    !state.developerMode ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  DISABLE
                </button>
                <button
                  onClick={() => triggerStateUpdate({ developerMode: true })}
                  className={`flex-1 py-1 text-[9px] font-bold rounded transition border ${
                    state.developerMode ? 'bg-red-950/30 border-red-500/30 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  ENABLE
                </button>
              </div>
            </div>

            {/* Simulated hardware information */}
            <div className="text-[9px] text-zinc-500 font-mono text-center flex items-center justify-center gap-1.5 border-t border-zinc-900 pt-2 bg-black/20 -mx-4 -mb-4 py-2">
              <span>Value-Gold Secure Client Lab</span>
              <span>·</span>
              <span className="hover:underline cursor-pointer text-zinc-400" onClick={() => triggerStateUpdate({ gpsStatus: 'on', developerMode: false, latitude: 12.9716, longitude: 77.5946, batteryLevel: 84, internetTracking: 'on', kilometres: 8.2, idleMinutes: 14, imeiLocked: true, unauthorizedAppsInstalled: false })}>RESET</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
