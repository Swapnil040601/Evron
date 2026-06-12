/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ActivityLog } from '../types';
import { 
  ShieldAlert, Radio, Terminal, EyeOff, LayoutGrid, RefreshCw, 
  Tv, Plus, Trash2, CheckCircle2, AlertTriangle, Play, StopCircle, 
  Cpu, Server, HardDrive, KeyRound, Wifi, Settings2, Sliders, CheckSquare, Square
} from 'lucide-react';
import { apiService } from '../services/api';
import HlsVideoTile from './HlsVideoTile';
import { triggerHaptic, HAPTIC_PATTERNS } from '../services/haptics';
import { showAlert, showConfirm } from '../utils/dialog';

interface LiveViewProps {
  cameras: Camera[];
  trackLogs: ActivityLog[];
  onTriggerAlert: (id: string) => void;
  onClearAlert: (id: string) => void;
  onRefreshCameras?: () => void;
}

export default function LiveView({ cameras, trackLogs, onTriggerAlert, onClearAlert, onRefreshCameras }: LiveViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'tracks' | 'nvr'>('grid');
  const [activeCamFilter, setActiveCamFilter] = useState<'ALL' | 'LIVE' | 'REC' | 'OFFLINE'>('ALL');

  // NVR Manager states
  const [nvrs, setNvrs] = useState<any[]>([]);
  const [isLoadingNvrs, setIsLoadingNvrs] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form Fields for NVR registration
  const [nvrName, setNvrName] = useState('');
  const [nvrIp, setNvrIp] = useState('');
  const [nvrBrand, setNvrBrand] = useState('Hikvision');
  const [nvrPort, setNvrPort] = useState('80');
  const [nvrUsername, setNvrUsername] = useState('admin');
  const [nvrPassword, setNvrPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Scanning state
  const [scanningNvrId, setScanningNvrId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredCams, setDiscoveredCams] = useState<any[]>([]);
  const [selectedCams, setSelectedCams] = useState<{ [key: string]: boolean }>({});

  // Filter local camera views
  const filteredCameras = cameras.filter(cam => {
    return activeCamFilter === 'ALL' || cam.status === activeCamFilter;
  });

  // Fetch NVR list on active trigger or tab select
  React.useEffect(() => {
    let active = true;
    const fetchNvrs = async () => {
      setIsLoadingNvrs(true);
      try {
        const list = await apiService.getNvrs();
        if (active) setNvrs(list);
      } catch (err) {
        console.error('Failed fetching NVR list in component:', err);
      } finally {
        if (active) setIsLoadingNvrs(false);
      }
    };
    if (activeSubTab === 'nvr') {
      fetchNvrs();
    }
    return () => { active = false; };
  }, [activeSubTab, refreshTrigger]);

  // Handle adding an NVR
  const handleAddNvr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nvrName || !nvrIp) {
      setErrorMessage('NVR Name and IP Address are required.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setIsConnecting(true);

    // Simulate link negotiation ping handshake
    await new Promise(resolve => setTimeout(resolve, 1400));

    try {
      const response = await apiService.saveNvr({
        name: nvrName,
        ip: nvrIp,
        brand: nvrBrand,
        port: parseInt(nvrPort) || 80,
        username: nvrUsername,
        password: nvrPassword
      });

      setSuccessMessage(`Negotiated handshake. NVR "${response.name}" successfully registered!`);
      setNvrName('');
      setNvrIp('');
      setNvrPassword('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failure handshake during NVR socket connect.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle deleting an NVR unit
  const handleDeleteNvr = async (id: string) => {
    if (!await showConfirm('Are you sure you want to decouple this NVR unit? All associated imported camera channels will be purged.')) {
      return;
    }
    try {
      await apiService.deleteNvr(id);
      setRefreshTrigger(prev => prev + 1);
      if (onRefreshCameras) onRefreshCameras();
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger simulated live camera channel scanning
  const handleScanNvr = async (nvrId: string) => {
    setScanningNvrId(nvrId);
    setScanProgress(0);
    setDiscoveredCams([]);
    setSelectedCams({});

    // Increment simulated loader
    for (let p = 10; p <= 100; p += 15) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setScanProgress(Math.min(p, 100));
    }

    try {
      const channels = await apiService.discoverNvrCameras(nvrId);
      setDiscoveredCams(channels);
      // Auto-toggle all channels selected by default
      const defaultToggles: { [key: string]: boolean } = {};
      channels.forEach(ch => {
        defaultToggles[ch.id] = true;
      });
      setSelectedCams(defaultToggles);
    } catch (err) {
      console.error(err);
    } finally {
      setScanningNvrId(null);
    }
  };

  // Handle importing selected cameras
  const handleImportSelected = async () => {
    const listToImport = discoveredCams.filter(c => selectedCams[c.id]);
    if (listToImport.length === 0) {
      await showAlert('Please check at least one discovered camera channel to import.', 'warning');
      return;
    }

    try {
      await apiService.importCameras(listToImport);
      await showAlert(`Import complete! ${listToImport.length} camera relays added to the Grid.`, 'success');
      setDiscoveredCams([]);
      setSelectedCams({});
      if (onRefreshCameras) onRefreshCameras();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete individual custom imported camera
  const handleDeleteCustomCamera = async (id: string) => {
    if (!await showConfirm('Dissociate this camera relay from the Surveillance Grid?')) return;
    try {
      await apiService.deleteImportedCamera(id);
      if (onRefreshCameras) onRefreshCameras();
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle selection checkbox for discover
  const toggleSelectCam = (id: string) => {
    setSelectedCams(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="space-y-6" id="surveillance-track-view">
      {/* Header controls with NVR Tab option */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Surveillance Grid</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Managed NVR array & Smart Track Logs</p>
        </div>

        {/* Mode Selector tabs switcher */}
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 flex-wrap gap-1 md:flex-nowrap">
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.light);
              setActiveSubTab('grid');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeSubTab === 'grid'
                ? 'bg-[#ef4444] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            2×2 GRID
          </button>
          
          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.light);
              setActiveSubTab('tracks');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeSubTab === 'tracks'
                ? 'bg-[#ef4444] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            TRACKS ({trackLogs.length})
          </button>

          <button
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.light);
              setActiveSubTab('nvr');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeSubTab === 'nvr'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            INTEGRATE NVR
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE MODES: GRID MODE */}
      {activeSubTab === 'grid' && (
        <div className="space-y-6" id="cameras-grid-view">
          {/* Quick camera status tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/85">
            <div className="flex items-center gap-1.5">
              {(['ALL', 'LIVE', 'REC', 'OFFLINE'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setActiveCamFilter(status)}
                  className={`px-3 py-1 bg-zinc-950 border text-[10px] font-mono rounded-lg transition ${
                    activeCamFilter === status
                      ? 'border-zinc-300 text-white font-bold bg-zinc-900'
                      : 'border-zinc-800/80 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {status} ({status === 'ALL' ? cameras.length : cameras.filter(c => c.status === status).length})
                </button>
              ))}
            </div>

            <div className="text-[10px] text-zinc-400 font-mono hidden md:block">
              Array Status: <span className="text-emerald-400 font-semibold font-mono">{cameras.length} active monitors linked</span>
            </div>
          </div>

          {/* Camera Feeds Interactive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="surveillance-camera-interactive-grid">
            {filteredCameras.map((cam) => {
              const actsLikeOffline = cam.status === 'OFFLINE';
              const actsLikeRec = cam.status === 'REC';
              const actsLikeLive = cam.status === 'LIVE' || !cam.status;

              return (
                <div
                  key={cam.id}
                  className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800 shadow-2xl bg-black group"
                >
                  {/* Live HLS video — fills entire tile */}
                  {!actsLikeOffline && (
                    <HlsVideoTile cameraId={cam.id} streamType="sub" />
                  )}

                  {/* Offline placeholder */}
                  {actsLikeOffline && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950">
                      <EyeOff className="w-8 h-8 text-zinc-700 stroke-[1.5]" />
                      <span className="text-[10px] font-mono text-zinc-600 uppercase">Feed Offline</span>
                      <p className="text-[9px] text-zinc-700 font-mono">NVR connectivity lost</p>
                    </div>
                  )}

                  {/* Subtle vignette */}
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.5)_100%)] z-10" />

                  {/* Top overlay — name + badge */}
                  <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-3 pt-2.5 pb-6 flex items-start justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-100 font-bold font-mono leading-tight">{cam.name}</p>
                      <p className="text-[9px] text-zinc-400 font-mono mt-0.5">{cam.location}</p>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[9px]">
                      {actsLikeLive && !actsLikeOffline && (
                        <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE
                        </span>
                      )}
                      {actsLikeRec && (
                        <span className="flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                          REC
                        </span>
                      )}
                      {actsLikeOffline && (
                        <span className="flex items-center gap-1 bg-zinc-900 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-md font-bold">
                          OFFLINE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Alert overlay — only when alertFlag */}
                  {cam.alertFlag && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="bg-red-950/95 border border-red-500 rounded-xl px-4 py-3 mx-4 text-center space-y-1.5 shadow-2xl w-full max-w-[220px]">
                        <ShieldAlert className="w-5 h-5 mx-auto text-red-500 animate-pulse" />
                        <p className="text-[10px] font-black text-red-200 font-mono uppercase tracking-wide">Security Alert</p>
                        <p className="text-[9px] text-red-300 leading-relaxed">{cam.alertMsg || 'Anomalous movement detected.'}</p>
                        {onClearAlert && (
                          <button
                            onClick={() => { triggerHaptic(HAPTIC_PATTERNS.success); onClearAlert(cam.id); }}
                            className="text-[9px] font-mono text-red-400 hover:text-red-200 underline mt-1"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bottom overlay — channel ID + test button (hover only) */}
                  <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6 flex items-end justify-between">
                    <span className="text-[9px] font-mono text-zinc-500">Ch.{cam.channel || cam.id}</span>
                    {!actsLikeOffline && onTriggerAlert && (
                      <button
                        onClick={() => onTriggerAlert(cam.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-rose-950/80 border border-rose-500/40 hover:bg-rose-900 text-rose-300 px-2 py-0.5 rounded text-[9px] font-bold font-mono"
                      >
                        TEST
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl flex items-center gap-3">
            <Radio className="w-4.5 h-4.5 text-red-500 animate-pulse" />
            <p className="text-[11px] text-zinc-400 font-mono">
              The camera engine updates every <strong className="text-zinc-200">1000ms</strong> using active on-device RTMP and security telemetry streaming links.
            </p>
          </div>
        </div>
      )}

      {/* RENDER TRACKS MODE */}
      {activeSubTab === 'tracks' && (
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-5 space-y-4" id="tracking-logs-subtab">
          <div className="border-b border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-[#ef4444] font-mono tracking-wider">CAMERA TRACK LOG</span>
              <p className="text-xs text-zinc-500">Chronological history of camera events, tracking sweeps, and proximity triggers</p>
            </div>
            
            <div className="text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1 rounded border border-zinc-800">
              Total captures: <strong className="text-white">{trackLogs.length} matches</strong>
            </div>
          </div>

          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400 font-mono uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Sensor Node</th>
                    <th className="py-3 px-4">Match Event Time</th>
                    <th className="py-3 px-4">Processing Latency</th>
                    <th className="py-3 px-4">Log Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {trackLogs.map((log) => {
                    const isSystemAlert = log.type === 'alert' || log.type === 'system';
                    const targetName = log.employeeName || 'Unidentified Thermal Outline';
                    return (
                      <tr key={log.id} className="hover:bg-zinc-900/40 transition">
                        <td className="py-3 px-4">
                          <span className={`font-semibold ${isSystemAlert ? 'text-amber-400 font-bold' : 'text-zinc-100'}`}>
                            {targetName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {log.cameraName || 'External Perimeter Barrier'}
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          {log.time}
                        </td>
                        <td className="py-3 px-4 text-zinc-500">
                          {log.duration || '2.0s'}
                        </td>
                        <td className="py-3 px-4">
                          {log.type === 'check_in' && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              DETECTED
                            </span>
                          )}
                          {log.type === 'alert' && (
                            <span className="text-[10px] text-rose-400 bg-rose-950/30 border border-rose-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                              SECURITY ALARM
                            </span>
                          )}
                          {log.type === 'system' && (
                            <span className="text-[10px] text-blue-400 bg-blue-950/30 border border-blue-500/20 px-1.5 py-0.5 rounded">
                              SYS TELEMETRY
                            </span>
                          )}
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

      {/* RENDER NVR TAB: ENTIRELY NEW COMPONENT MODULE INTEGRATION */}
      {activeSubTab === 'nvr' && (
        <div className="space-y-6" id="nvr-config-management-tab">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col (2/3 size): NVR UNIT LIST & DISCOVERY */}
            <div className="lg:col-span-2 space-y-6">
              {/* NVR list panel */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono tracking-wide">CONNECTED NVR UNITS</h3>
                    <p className="text-xs text-zinc-400">Manage NVR units linked to this subnet</p>
                  </div>
                  <span className="text-[10px] font-mono bg-zinc-950 border border-zinc-800 px-2 py-1 rounded text-zinc-400">
                    Active Handshakes: {nvrs.length}
                  </span>
                </div>

                {isLoadingNvrs ? (
                  <div className="py-10 text-center text-xs text-zinc-500 font-mono flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    Querying local subnet devices...
                  </div>
                ) : nvrs.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-zinc-800/80 rounded-xl text-xs text-zinc-500 font-mono space-y-2">
                    <HardDrive className="w-8 h-8 text-zinc-600 mx-auto stroke-[1]" />
                    <p>No active NVR units discovered or configured on this hub.</p>
                    <p className="text-[10px] text-zinc-650">Register your first recorder using the link form on the right.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5">
                    {nvrs.map((nvr) => {
                      const isThisScanning = scanningNvrId === nvr.id;
                      return (
                        <div 
                          key={nvr.id}
                          className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 border-l-2 border-l-blue-500 hover:border-zinc-800 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white font-mono">{nvr.name}</span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase font-mono bg-blue-950/40 border border-blue-900/45 text-blue-400">
                                {nvr.brand}
                              </span>
                              <span className="flex items-center gap-1 text-[9px] bg-emerald-950/30 text-emerald-400 border border-emerald-900/30 px-1.5 py-0.2 rounded font-bold font-mono">
                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                {nvr.status || 'Online'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[10px] font-mono text-zinc-400">
                              <div>IP: <strong className="text-zinc-200">{nvr.ip}</strong></div>
                              <div>Port: <strong className="text-zinc-200">{nvr.port || 80}</strong></div>
                              <div className="col-span-2">Account: <span className="text-zinc-500 font-semibold">{nvr.username || 'admin'}</span></div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              disabled={!!scanningNvrId}
                              onClick={() => handleScanNvr(nvr.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition ${
                                isThisScanning 
                                  ? 'bg-zinc-900 text-blue-400 cursor-not-allowed border border-blue-900/20'
                                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/20'
                              }`}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isThisScanning ? 'animate-spin' : ''}`} />
                              {isThisScanning ? `SCANNING FEED...` : `DISCOVER CHANNELS`}
                            </button>

                            <button
                              disabled={!!scanningNvrId}
                              onClick={() => handleDeleteNvr(nvr.id)}
                              className="p-1.5 bg-zinc-900 hover:bg-red-950/40 border border-zinc-800 text-zinc-505 hover:text-red-400 rounded-lg transition"
                              title="Delete NVR registration Link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Scanning discovery progress */}
              {scanningNvrId && (
                <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-xl space-y-3 font-mono animate-pulse">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-blue-400 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 animate-spin" />
                      NEGOTIATING NVR CHANNELS OVER DISCOVER SCHEME...
                    </span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500 leading-normal space-y-0.5">
                    <p>&gt; IP {nvrs.find(n => n.id === scanningNvrId)?.ip || '192.168.1.100'} query broadcast started</p>
                    <p>&gt; Exposing RTSP stream parameters on media port...</p>
                    <p>&gt; Analyzing frame indices and H.264 high-profile codec maps...</p>
                  </div>
                </div>
              )}

              {/* Scanned / Discovered Camera channel Checklist & Importer */}
              {discoveredCams.length > 0 && !scanningNvrId && (
                <div className="bg-zinc-950 border border-blue-900/40 rounded-xl p-5 space-y-4 shadow-xl shadow-blue-950/10">
                  <div className="border-b border-zinc-800/80 pb-3 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold font-mono tracking-wider text-blue-400">🛰️ SUB-CHANNELS DISCOVERED</h4>
                      <p className="text-[11px] text-zinc-400">Select which hardware feeds to import into Active Surveillance</p>
                    </div>
                    
                    <button
                      onClick={handleImportSelected}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono transition shadow-lg shadow-emerald-900/10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      IMPORT SELECTED ({Object.values(selectedCams).filter(Boolean).length}) RELAYS
                    </button>
                  </div>

                  {/* Channel display logs row */}
                  <div className="divide-y divide-zinc-900 border border-zinc-900 rounded-lg overflow-hidden">
                    {discoveredCams.map((cam) => {
                      const isChecked = !!selectedCams[cam.id];
                      return (
                        <div 
                          key={cam.id}
                          onClick={() => toggleSelectCam(cam.id)}
                          className={`p-3 text-xs font-mono flex items-center justify-between gap-4 cursor-pointer select-none transition ${
                            isChecked ? 'bg-blue-950/25 hover:bg-blue-950/35' : 'hover:bg-zinc-900/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              {isChecked ? (
                                <CheckCircle2 className="w-5 h-5 text-blue-400 stroke-[2.5]" />
                              ) : (
                                <span className="w-5 h-5 block border border-zinc-800 rounded-lg hover:border-zinc-500 transition" />
                              )}
                            </div>

                            <div className="space-y-0.5">
                              <span className="font-bold text-zinc-150 text-[11px] block">{cam.name}</span>
                              <div className="flex items-center gap-3 text-[9px] text-zinc-400">
                                <span>Sec: <strong className="text-zinc-200">{cam.location}</strong></span>
                                <span>Res: <strong className="text-zinc-200">{cam.resolution}</strong></span>
                                <span>FPS: <strong className="text-zinc-200">{cam.fps}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center font-bold text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                            RTSP LINK OK
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Imported Relays Management section */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white font-mono tracking-wide border-b border-zinc-800 pb-3">
                  CURRENTLY ACTIVE CUSTOM RELAYS
                </h3>

                {cameras.filter(c => c.id.includes('ch')).length === 0 ? (
                  <p className="text-[11px] text-zinc-500 font-mono py-4 text-center">
                    No dynamic imported NVR cameras currently active. Run a subnet scan above to add customized channels.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cameras.filter(c => c.id.includes('ch')).map(cam => (
                      <div 
                        key={cam.id}
                        className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="space-y-0.5">
                          <strong className="text-zinc-250 font-bold block truncate text-[11px]">{cam.name}</strong>
                          <span className="text-[8.5px] text-zinc-500 block">ID: {cam.id} | Location: {cam.location}</span>
                        </div>

                        <button
                          onClick={() => handleDeleteCustomCamera(cam.id)}
                          className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg border border-transparent hover:border-zinc-800 hover:bg-zinc-900 transition flex-shrink-0"
                          title="Purge Camera Relay"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col (1/3 size): NEW NVR CONNECTION PARAMETERS FORM */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-4 self-start">
              <div>
                <h3 className="text-sm font-bold text-white font-mono tracking-wide">CONNECT NEW NVR</h3>
                <p className="text-xs text-zinc-400 mt-1">Hook a local Network Video Recorder into active database logs</p>
              </div>

              <form onSubmit={handleAddNvr} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 font-mono tracking-wider uppercase block">NVR unit Identifier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hikvision Main Storage"
                    value={nvrName}
                    onChange={(e) => setNvrName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono placeholder:text-zinc-650"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 font-mono tracking-wider uppercase block font-sans">Subnet IP Address / DDNS</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 192.168.1.18"
                      value={nvrIp}
                      onChange={(e) => setNvrIp(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono placeholder:text-zinc-650"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 font-mono tracking-wider uppercase block text-right">Port</label>
                    <input
                      type="number"
                      required
                      placeholder="80"
                      value={nvrPort}
                      onChange={(e) => setNvrPort(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono placeholder:text-zinc-650 text-center"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 font-mono tracking-wider uppercase block">Hardware Brand Profile</label>
                  <select
                    value={nvrBrand}
                    onChange={(e) => setNvrBrand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-805/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                  >
                    <option value="Hikvision">Hikvision Digital Co.</option>
                    <option value="Dahua">Dahua CCTV Security</option>
                    <option value="Axis">Axis Communications</option>
                    <option value="Uniview">Uniview Networks</option>
                    <option value="Generic ONVIF">Generic ONVIF (RTSP Stream)</option>
                  </select>
                </div>

                <div className="border-t border-zinc-850 my-2 pt-2 grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 font-mono tracking-wider uppercase block">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="admin"
                      value={nvrUsername}
                      onChange={(e) => setNvrUsername(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono placeholder:text-zinc-650"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-zinc-400 font-mono tracking-wider uppercase block">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={nvrPassword}
                      onChange={(e) => setNvrPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono placeholder:text-zinc-650"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-red-950/40 p-3 rounded-lg border border-red-900/60 text-[10px] text-red-400 font-mono flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-950 text-[10px] text-emerald-400 font-mono flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5 bg-transparent" />
                    <span>{successMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-mono p-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      NEGOTIATING HANDSHAKE...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      CONNECT RECORDER
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
