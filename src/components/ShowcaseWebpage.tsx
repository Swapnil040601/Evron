import React, { useState } from 'react';
import {
  Shield,
  Video,
  Map,
  Cpu,
  Layers,
  Activity,
  Sparkles,
  TrendingUp,
  Building2,
  Briefcase,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronDown,
  HelpCircle,
  Database,
  Smartphone,
  Eye,
  AlertTriangle,
  Play,
  Calculator,
  UserCheck,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

// Relative path designations for the generated assets resolving cleanly in Vite
const heroImage = "/src/assets/images/command_center_hero_1780951173619.png";
const mapMockup = "/src/assets/images/geofence_map_mockup_1780951190600.png";
const cctvMatchMockup = "/src/assets/images/ai_cctv_analytics_1780951205125.png";

interface ShowcaseProps {
  onLaunchAdminPortal: () => void;
}

export default function ShowcaseWebpage({ onLaunchAdminPortal }: ShowcaseProps) {
  // Navigation active tab for showcase layout
  const [activeTab, setActiveTab] = useState<'all' | 'geofence' | 'cctv' | 'hardware'>('all');
  
  // Interactive zoom scale for geofence preview mockup
  const [geofenceZoom, setGeofenceZoom] = useState<number>(1.0);
  
  // Interactive Simulator State
  const [testWorkerInside, setTestWorkerInside] = useState<boolean>(true);
  const [testCctvAlertActive, setTestCctvAlertActive] = useState<boolean>(false);
  const [testDevModeActive, setTestDevModeActive] = useState<boolean>(false);
  const [simLogList, setSimLogList] = useState<Array<{ id: string; msg: string; source: string; type: 'info' | 'warn' | 'critical' }>>([
    { id: '1', msg: 'Watchtower agent telemetry pipeline initialized.', source: 'CORE ENGINE', type: 'info' },
    { id: '2', msg: 'Satellite GPS stream connected: Bengaluru HQ Zone 1.', source: 'GEOPERIMETER SENSOR', type: 'info' },
    { id: '3', msg: 'All CCTV streams online with deep-learning vision inference.', source: 'AI SENTINEL', type: 'info' },
  ]);

  // Use Case selector active ID
  const [selectedUseCase, setSelectedUseCase] = useState<string>('vault');

  // ROI Calculator Parameters
  const [numStaff, setNumStaff] = useState<number>(80);
  const [averageIncidentsPerMonth, setAverageIncidentsPerMonth] = useState<number>(12);
  const [averageMinutesPerIncident, setAverageMinutesPerIncident] = useState<number>(150);

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Trigger simulated events in the landing page prototype
  const addSimLog = (msg: string, source: string, type: 'info' | 'warn' | 'critical') => {
    setSimLogList(prev => [
      {
        id: `LOG-${Date.now()}`,
        msg,
        source,
        type
      },
      ...prev.slice(0, 7) // keep last 8 logs
    ]);
  };

  const handleSimulateGeofence = () => {
    const nextState = !testWorkerInside;
    setTestWorkerInside(nextState);
    if (!nextState) {
      addSimLog('⚠️ [BREACH] Worker EMP002 moved outside the 300m designated perimeter limit!', 'GPS RADAR', 'critical');
    } else {
      addSimLog('🎯 [RESOLVED] Worker EMP002 has returned inside the secure geoperimeter zone.', 'GPS RADAR', 'info');
    }
  };

  const handleSimulateCctv = () => {
    const nextState = !testCctvAlertActive;
    setTestCctvAlertActive(nextState);
    if (nextState) {
      addSimLog('🚨 [ALARM] CCTV AI detected unauthorized entry in IT Vault and Server sector!', 'AI CAMERA 3', 'critical');
    } else {
      addSimLog('🟢 [CLEARED] CCTV surveillance anomaly cleared by Operations Administrator.', 'CAMERA FEED SECURE', 'info');
    }
  };

  const handleSimulateDevMode = () => {
    const nextState = !testDevModeActive;
    setTestDevModeActive(nextState);
    if (nextState) {
      addSimLog('⛔ [LOCKOUT] USB Debugging and Developer Mode detected on worker device! Application suspended.', 'HARDWARE INTEGRITY GUARD', 'critical');
    } else {
      addSimLog('💎 [VERIFIED] Device integrity authenticated. Resuming secure workspace access.', 'HARDWARE SYSTEM', 'info');
    }
  };

  // ROI Calculator mathematical projections
  const monthlyHoursSaved = parseFloat(((numStaff * 2.5) + (averageIncidentsPerMonth * (averageMinutesPerIncident / 60) * 0.85)).toFixed(1));
  const estimatedSavingsInUSD = Math.round(monthlyHoursSaved * 42); // Assumed average blending consulting or liability rate per hour
  const riskMitigationScore = Math.min(100, Math.round(75 + (averageIncidentsPerMonth * 1.8)));

  const useCasesList = [
    {
      id: 'vault',
      title: 'High-Value Vault Sentry',
      subtitle: 'Preserve physical storage, bank zones, gold testing labs & IT server cages from internal exploits.',
      stat: '98.5% Breach Prevention',
      badge: 'Highly Sensitive Environments',
      description: 'By merging deep-learning hand/object movement checks inside small 5x5ft zones and enforcing strict hardware lockouts of all mobile recorders, precious sorting chambers and private server corridors remain impregnable to leaks or physical storage tampering.',
      metrics: ['Automatic visitor look logging', 'Precious metal hand tracking', 'Secure NVR integration with local bypass protection']
    },
    {
      id: 'patrol',
      title: 'Boundary GPS & Field Patrols',
      subtitle: 'Track offsite security teams and construction site margins in real-time.',
      stat: '100% Boundary Audit Compliance',
      badge: 'Civil & Strategic Infrastructure',
      description: 'Enforce circular geofences ranging between 100m to 1000m. If an active patrol member wanders off their assigned sector during the shift schedules, command rooms are immediately informed through visual and satellite watchtower alarms.',
      metrics: ['Continuous GPS telemetry streams', 'Instant spatial boundary validations', 'Historic breadcrumb path logs storage']
    },
    {
      id: 'offline',
      title: 'Anti-Evasion & Offline Protection',
      subtitle: 'Mitigating workspace manipulation, mock locations, or network local hooks.',
      stat: '0% False Positive Safe Rate',
      badge: 'Sovereign Workplace Security',
      description: 'Workers seeking local loopholes (such as mock location applications, offline airplane de-synchronization, secure-wifi cellular bypasses, or emulator injection) are intercepted instantly. Operations keep going with secure offline logs synchronized automatically on reunion.',
      metrics: ['USB Debugging active blockades', 'Network airplane mode override counters', 'Hardware verification tokens']
    }
  ];

  const faqsList = [
    {
      q: 'How does the Mobile Hardware Integrity lock work?',
      a: 'The Watchtower agent utilizes native hardware integrations to check if Developer Options are activated or if a USB debugger connection is listening. In compliance with strict workplace regulations, the application enters an immediate lock-out state, stopping access until the threat is removed.'
    },
    {
      q: 'Can the circular geofence boundary parameters be changed live?',
      a: 'Yes, fully. Geofence Administrators can use our Map Controller interface to instantly define custom coordinates or click directly on our canvas vector grid. Radiuses can be adjusted via slider values on-screen, prompting immediate perimeter evaluation.'
    },
    {
      q: 'Does the CCTV surveillance AI require cloud streaming or run locally?',
      a: 'It supports both. Our hybrid architecture runs local machine-learning inference on edge-NVR systems to protect storage bandwidth while utilizing a high-performance central coordinator for alerts logging.'
    },
    {
      q: 'Is local client data safe when working offline or in cellular blackspots?',
      a: 'Absolutely. Watchtower includes a robust offline engine. It tracks cumulative security alerts, roster violations, and check-out logs inside a secure client cache. As soon as a verified network connection is restored, the information is pushed securely to our server.'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 select-none pb-24 font-sans relative overflow-x-hidden" id="framer-webpage-root">
      
      {/* 1. Glassmorphic Sticky Header Navbar Section */}
      <nav className="fixed top-4 left-4 right-4 z-50 max-w-5xl mx-auto bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-full px-5 py-3 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-650 flex items-center justify-center font-black text-white text-xs tracking-tighter shadow-md">
            EN
          </div>
        </div>

        {/* Desktop Anchor Links */}
        <div className="hidden md:flex items-center gap-6 text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#interactive-sandbox" className="hover:text-white transition">Live Sandbox</a>
          <a href="#usecases" className="hover:text-white transition">Use Cases</a>
          <a href="#roi" className="hover:text-white transition font-semibold text-red-400">ROI Calculator</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
        </div>

        <div>
          <button
            onClick={onLaunchAdminPortal}
            className="p-2 px-4 bg-red-650 hover:bg-red-550 border border-red-500 text-white rounded-full transition flex items-center justify-center cursor-pointer font-bold font-mono text-[9.5px] uppercase tracking-wider gap-1.5 shadow-lg shadow-red-950/40"
          >
            Launch System Panel
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 md:px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1)_0%,transparent_70%)] pointer-events-none" />
        
        {/* Upper Badge */}
        <div className="inline-flex items-center gap-2 bg-red-950/20 border border-red-900/50 p-1.5 px-3 rounded-full mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[9px] font-mono tracking-widest font-black uppercase text-red-400">Interactive Framer Product Tour Deck</span>
        </div>

        {/* Editorial Modern Hero Heading */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-sans font-black tracking-tight text-white leading-tight max-w-3xl">
          Simple Security and Attendance for <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-450 to-amber-500">Workplace Safety</span>
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl mt-5 font-sans">
          Welcome to Evron Watchtower. Real-time circular geofences, device hardware developer mode status indicators, and custom camera area monitoring. Designed for simple remote tracking and attendance alignment.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full max-w-sm">
          <a
            href="#interactive-sandbox"
            className="w-full sm:w-auto p-3 px-5 text-center bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-100 hover:text-white rounded-xl font-bold font-mono text-[10px] uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2 shadow-xl"
          >
            <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            Try Prototype Sandbox
          </a>
          
          <button
            onClick={onLaunchAdminPortal}
            className="w-full sm:w-auto p-3 px-6 text-center bg-red-650 hover:bg-red-550 border border-red-500 text-white rounded-xl font-black font-mono text-[10px] uppercase tracking-widest transition cursor-pointer flex items-center justify-center gap-2 shadow-2xl shadow-red-950/50"
          >
            Launch System Panel
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main 3D High-Tech Hero Asset Showcase inside Framer Container */}
        <div className="mt-16 w-full relative group">
          {/* Glowing Aura backdrop */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000" />
          
          <div className="relative bg-zinc-950/95 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Top Frame Action Bar */}
            <div className="bg-zinc-900/90 border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between font-mono text-[9px] text-zinc-500 uppercase tracking-widest leading-none">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                WATCHTOWER SECURE_PANEL // INTERACTIVE PREVIEW
              </span>
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
              </div>
            </div>

            {/* Premium Rendered High Tech cybersecurity command center room Image */}
            <div className="relative aspect-video max-h-[480px] w-full bg-zinc-950/60 overflow-hidden flex items-center justify-center">
              <img 
                src={heroImage} 
                alt="Cybersecurity Command Center Showcase" 
                className="w-full h-full object-cover select-none pointer-events-none opacity-90 brightness-95"
                referrerPolicy="no-referrer"
              />
              
              {/* Overlay HUD indicators */}
              <div className="absolute bottom-4 left-4 bg-zinc-950/90 border border-zinc-800 p-2.5 rounded-xl font-mono text-[8px] text-zinc-400 space-y-1 max-w-[200px] text-left leading-normal">
                <span className="text-emerald-500 font-bold block uppercase tracking-wider">● SYSTEM RUNNING ONLINE</span>
                <span className="text-zinc-500">Service: Attendance & Safety</span>
                <span className="text-zinc-500">Security logs synchronized and persisted in storage.</span>
              </div>

              <div className="absolute top-4 right-4 bg-zinc-950/95 border border-zinc-850 p-2.5 rounded-xl font-mono text-[8px] text-zinc-350 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span className="font-extrabold uppercase tracking-wider">SECURE SHIELD ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid Bento */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20 border-t border-zinc-900 bg-[radial-gradient(circle_at_bottom,rgba(239,68,68,0.01)_0%,transparent_55%)]">
        <div className="text-center space-y-3 mb-16">
          <span className="text-[9px] font-mono text-red-500 font-extrabold uppercase tracking-widest">Core Capabilities</span>
          <h2 className="text-2xl sm:text-4xl font-sans font-black text-white tracking-tight">
            Integrated Defense, Boundary by Boundary
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Unlike standard employee trackers, Evron Watchtower combines satellite GPS geofencing, deep hardware verification, and surveillance optical bounds to secure workplace operations.
          </p>
        </div>

        {/* Feature Grid Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Feature 1: Geofence Sentry (Col-span 7) */}
          <div className="lg:col-span-7 bg-zinc-900/45 border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-red-900/40 transition duration-300">
            <div className="space-y-3 text-left">
              <div className="inline-flex items-center gap-1.5 bg-red-950/30 border border-red-900/30 p-1 px-2.5 rounded-full font-mono text-[8px] font-bold text-red-400 uppercase tracking-widest">
                <Map className="w-3 h-3 text-red-500" />
                GPS Space Controller
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Circular Perimeter Boundaries</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Assign custom circular security fences directly on our interactive map. Employees on shifts are monitored continuously. If they exit the configured boundary limit, an alert is logged to the command center immediately.
              </p>
            </div>

            {/* Custom Map Mockup generated image with overlays */}
            <div className="bg-zinc-950 rounded-xl overflow-hidden border border-zinc-850 p-1.5 relative group" id="geofence-map-container">
              <div className="w-full h-auto max-h-[250px] overflow-hidden rounded-lg">
                <img 
                  src={mapMockup} 
                  alt="Satellite Geofence Boundary Map Mockup" 
                  className="w-full h-auto max-h-[250px] object-cover transition-transform duration-300"
                  style={{ transform: `scale(${geofenceZoom})`, transformOrigin: 'center' }}
                  referrerPolicy="no-referrer"
                  id="geofence-map-image"
                />
              </div>
              
              <div className="absolute top-4 left-4 bg-zinc-950/95 border border-zinc-800 py-1 px-2.5 rounded-lg text-[8px] font-mono text-zinc-400 font-bold uppercase flex items-center gap-1.5" id="geofence-radar-status">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                RADAR: 300m LIMIT Roster
              </div>

              {/* Zoom Control Overlay */}
              <div className="absolute bottom-4 right-4 bg-zinc-950/95 border border-zinc-800 rounded-lg p-1.5 flex items-center gap-1.5 shadow-2xl z-20" id="geofence-zoom-control-overlay">
                <button 
                  onClick={() => setGeofenceZoom(prev => Math.max(1.0, prev - 0.25))}
                  disabled={geofenceZoom <= 1.0}
                  className="w-6 h-6 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
                  title="Zoom Out"
                  id="geofence-zoom-out-btn"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="text-[9px] font-mono font-bold text-zinc-300 px-1 text-center min-w-[32px]" id="geofence-zoom-level">
                  {Math.round(geofenceZoom * 100)}%
                </span>
                <button 
                  onClick={() => setGeofenceZoom(prev => Math.min(3.0, prev + 0.25))}
                  disabled={geofenceZoom >= 3.0}
                  className="w-6 h-6 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
                  title="Zoom In"
                  id="geofence-zoom-in-btn"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Feature 2: CCTV Surveillance (Col-span 5) */}
          <div className="lg:col-span-5 bg-zinc-900/45 border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-red-905/40 transition duration-300">
            <div className="space-y-3 text-left">
              <div className="inline-flex items-center gap-1.5 bg-rose-950/30 border border-rose-900/30 p-1 px-2.5 rounded-full font-mono text-[8px] font-bold text-rose-400 uppercase tracking-widest">
                <Video className="w-3 h-3 text-rose-500" />
                COMPUTER VISION AI
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Surveillance CCTV Sentry</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect external NVR networks or local system streams. The AI automatically scans workplace activity for unauthorized entry, safety equipment, and hands-on zone compliance.
              </p>
            </div>

            {/* CCTV Analytics image generated earlier */}
            <div className="bg-zinc-950 rounded-xl overflow-hidden border border-zinc-850 p-1.5 relative group">
              <img 
                src={cctvMatchMockup} 
                alt="AI CCTV Object Detection Surveillance" 
                className="w-full h-auto max-h-[250px] object-cover rounded-lg group-hover:scale-[1.01] transition duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-4 left-4 bg-emerald-950/95 border border-emerald-500/20 py-1 px-2 rounded font-mono text-[7.5px] text-emerald-400 font-extrabold uppercase">
                🟢 SECURE COMPLIANCE: 100% SUCCESS
              </div>
            </div>
          </div>

          {/* Feature 3: Deep Hardware integrity guard (Col-span 6) */}
          <div className="lg:col-span-6 bg-zinc-900/45 border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-red-900/40 transition duration-300">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-3 text-left max-w-sm">
                <div className="inline-flex items-center gap-1.5 bg-amber-950/30 border border-amber-900/30 p-1 px-2.5 rounded-full font-mono text-[8px] font-bold text-amber-500 uppercase tracking-widest">
                  <Smartphone className="w-3 h-3 text-amber-500" />
                  PHYSICAL SECURITY LAYER
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Developer Mode Deactivation Check</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Avoid staff evasions via fake mock locations or emulator injections. If USB debugging options or developer modes are detected active on the employee device, the corporate application locks out immediately.
                </p>
              </div>

              {/* Minimal Shield status widget */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-left font-mono text-[9px] w-full sm:w-auto min-w-[200px] space-y-2 flex-shrink-0">
                <span className="text-zinc-600 block text-[8px] uppercase">DEVICE SECURITY HEALTH STATE</span>
                <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                  <span className="text-zinc-400">USB Debugging:</span>
                  <span className="text-emerald-400 font-bold uppercase">Disabled (Safe)</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                  <span className="text-zinc-400">Mock GPS:</span>
                  <span className="text-emerald-400 font-bold uppercase">Blocked (Safe)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Device Integrity:</span>
                  <span className="text-[#ef4444] font-bold uppercase animate-pulse">LOCK ACTIVE</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[9px] font-mono text-zinc-500 uppercase">
              <span className="bg-zinc-950 border border-zinc-850 px-2 py-1 rounded">✔ USB Lockout</span>
              <span className="bg-zinc-950 border border-zinc-850 px-2 py-1 rounded">✔ Mock GPS Spoof block</span>
              <span className="bg-zinc-950 border border-zinc-850 px-2 py-1 rounded">✔ Secure Wi-Fi Verification</span>
            </div>
          </div>

          {/* Feature 4: Decentralized Offline Synchronization Engine (Col-span 6) */}
          <div className="lg:col-span-6 bg-zinc-900/45 border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:border-red-900/40 transition duration-300">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="space-y-3 text-left max-w-sm">
                <div className="inline-flex items-center gap-1.5 bg-blue-950/30 border border-blue-900/30 p-1 px-2.5 rounded-full font-mono text-[8px] font-bold text-blue-400 uppercase tracking-widest">
                  <Database className="w-3 h-3 text-blue-400" />
                  PERSISTENT OFFLINE CACHE
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight font-sans">Evasion Defense & Offline Sync</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Employees cannot bypass security radar by turning off the cellular internet or enabling airplane mode. Security violations, check-outs, and geofence departures are stored in a secure local database and uploaded once back online.
                </p>
              </div>

              {/* Minimal Sync Activity Log Widget */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-left font-mono text-[9px] w-full sm:w-auto min-w-[200px] space-y-2 flex-shrink-0">
                <span className="text-zinc-600 block text-[8px] uppercase">OFFLINE EVENT QUEUE</span>
                <div className="flex items-center justify-between text-yellow-500 font-bold">
                  <span>● 3 Local Warnings Cached</span>
                  <span className="text-[7.5px] uppercase bg-yellow-500/10 px-1 border border-yellow-500/20 rounded animate-pulse">PENDING SYNC</span>
                </div>
                <p className="text-[7.5px] text-zinc-500 leading-tight">
                  Sovereign client database continues recording tracking metrics without cellular networks.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-[9px] font-mono text-zinc-500 uppercase">
              <span className="bg-zinc-950 border border-zinc-850 px-2 py-1 rounded">✔ SQLite Vault Persistence</span>
              <span className="bg-zinc-950 border border-zinc-850 px-2 py-1 rounded">✔ Re-connection automatic upload</span>
              <span className="bg-zinc-950 border border-zinc-850 px-2 py-1 rounded">✔ Tamperproof timestamp audit tokens</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Interactive Framer Sandbox Section */}
      <section id="interactive-sandbox" className="max-w-5xl mx-auto px-4 py-20 border-t border-zinc-900">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[9px] font-mono text-red-500 font-black uppercase tracking-widest">Live Interactive Sandbox</span>
          <h2 className="text-2xl sm:text-4xl font-sans font-black text-white tracking-tight">
            Stress Test the Security Protocol
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Click the mock events below to simulate field team behaviors. See the telemetry radar intercept, secure-lockout, and update logs in real-time.
          </p>
        </div>

        {/* Dynamic Sandbox Simulator UI Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Left Controls column (Col-span 5) */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-805 space-y-6">
            <h3 className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest pb-3 border-b border-zinc-800">
              Interactive Incident Controller
            </h3>

            {/* Simulator Button Group */}
            <div className="space-y-4 text-left">
              
              {/* Geofence Simulator button */}
              <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">1. Satellite Geoperimeter</span>
                  <span className={`text-[8px] font-mono uppercase px-1 rounded font-black ${
                    testWorkerInside 
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                      : 'text-[#ef4444] bg-red-550/10 border border-red-500/20'
                  }`}>
                    {testWorkerInside ? 'In Zone (Safe)' : 'Perimeter breached'}
                  </span>
                </div>
                <p className="text-[9.5px] text-zinc-500 leading-normal">
                  Displace patrolling employee coordinate points outside theHQ allowed limit radius boundary.
                </p>
                <button
                  onClick={handleSimulateGeofence}
                  className={`w-full py-2 rounded-lg border text-[9px] font-mono uppercase font-black transition tracking-wider cursor-pointer mt-1 ${
                    testWorkerInside
                      ? 'bg-zinc-900 border-zinc-800 hover:border-amber-500/50 text-amber-500'
                      : 'bg-emerald-900/20 border-emerald-505 text-emerald-400'
                  }`}
                >
                  {testWorkerInside ? '⚡ Move Worker Outside Limit' : '🎯 Return Worker inside Perimeter'}
                </button>
              </div>

              {/* CCTV Unauthorized sector breach button */}
              <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">2. Optical Vision AI Sentry</span>
                  <span className={`text-[8px] font-mono uppercase px-1 rounded font-black ${
                    !testCctvAlertActive 
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                      : 'text-[#ef4444] bg-red-550/10 border border-red-500/20 animate-pulse'
                  }`}>
                    {!testCctvAlertActive ? 'No Anomaly' : 'Intrusion Alerting'}
                  </span>
                </div>
                <p className="text-[9.5px] text-zinc-500 leading-normal">
                  Simulate unauthorized access into the secure Server Cage vault sector.
                </p>
                <button
                  onClick={handleSimulateCctv}
                  className={`w-full py-2 rounded-lg border text-[9px] font-mono uppercase font-black transition tracking-wider cursor-pointer mt-1 ${
                    !testCctvAlertActive
                      ? 'bg-zinc-900 border-zinc-800 hover:border-red-500/50 text-red-500'
                      : 'bg-zinc-950 border-zinc-855 text-zinc-400'
                  }`}
                >
                  {!testCctvAlertActive ? '🚨 Intrusion in IT Vault Server Sector' : '🟢 Clear Camera Alarm Anomaly'}
                </button>
              </div>

              {/* Developer Options and USB Debugging simulated lock button */}
              <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">3. Integrity Lockout Sentry</span>
                  <span className={`text-[8px] font-mono uppercase px-1 rounded font-black ${
                    !testDevModeActive 
                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                      : 'text-[#ef4444] bg-red-550/10 border border-red-500/20 animate-bounce'
                  }`}>
                    {!testDevModeActive ? 'Passed' : 'LOCK OUT'}
                  </span>
                </div>
                <p className="text-[9.5px] text-zinc-500 leading-normal">
                  Turn on simulated mobile US debugger or root mode option.
                </p>
                <button
                  onClick={handleSimulateDevMode}
                  className={`w-full py-2 rounded-lg border text-[9px] font-mono uppercase font-black transition tracking-wider cursor-pointer mt-1 ${
                    !testDevModeActive
                      ? 'bg-zinc-900 border-zinc-800 hover:border-red-500/50 text-red-500'
                      : 'bg-zinc-950 border-zinc-855 text-zinc-400'
                  }`}
                >
                  {!testDevModeActive ? '⛔ Turn On USB Debugger on Phone' : '💎 Turn Off Developer Options'}
                </button>
              </div>

            </div>
          </div>

          {/* Right Live Streams Simulation monitor (Col-span 7) */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3 text-left">
              <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                Live Active Telemetry Console Feed
              </h4>
              <p className="text-[10.5px] text-zinc-500 leading-relaxed">
                Watch how the security radar, geofencing pipelines, and lockout registers update live in response to your manual commands.
              </p>
            </div>

            {/* Virtualized HUD Log viewer box */}
            <div className="bg-zinc-950 rounded-xl border border-zinc-850 p-4 font-mono text-[9px] text-left space-y-2 min-h-[220px] max-h-[260px] overflow-y-auto">
              {simLogList.map((log) => (
                <div key={log.id} className="flex items-start gap-2 border-b border-zinc-950 pb-1.5 leading-normal">
                  <span className="text-zinc-650 flex-shrink-0">[{new Date().toLocaleTimeString()}]</span>
                  <strong className={`flex-shrink-0 px-1 bg-zinc-900 border uppercase text-[7.5px] tracking-wider rounded font-mono ${
                    log.type === 'critical' ? 'text-red-500 border-red-500/20' : 'text-zinc-400 border-zinc-800'
                  }`}>
                    {log.source}
                  </strong>
                  <span className={log.type === 'critical' ? 'text-red-400 font-bold' : log.type === 'warn' ? 'text-amber-400' : 'text-zinc-300'}>
                    {log.msg}
                  </span>
                </div>
              ))}
            </div>

            {/* System Status Metrics summary cards */}
            <div className="grid grid-cols-3 gap-2.5">
              
              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 text-left">
                <span className="text-zinc-650 block text-[8px] font-mono uppercase">PERIMETER COUNT</span>
                <span className={`text-xs font-mono font-bold ${testWorkerInside ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                  {testWorkerInside ? '100% Inside' : '1 Breach Checked'}
                </span>
              </div>

              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 text-left">
                <span className="text-zinc-650 block text-[8px] font-mono uppercase">AI CHASSIS</span>
                <span className={`text-xs font-mono font-bold ${!testCctvAlertActive ? 'text-emerald-400' : 'text-[#ef4444] font-black animate-pulse'}`}>
                  {!testCctvAlertActive ? 'Nominal' : 'Active Violation'}
                </span>
              </div>

              <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-850 text-left">
                <span className="text-zinc-650 block text-[8px] font-mono uppercase">SECURITY ACCESS</span>
                <span className={`text-xs font-mono font-bold ${!testDevModeActive ? 'text-emerald-400' : 'text-rose-500 font-black uppercase'}`}>
                  {!testDevModeActive ? 'Authenticated' : 'Lockout Screen Active'}
                </span>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 5. Usecases Section with Carousel selector */}
      <section id="usecases" className="max-w-5xl mx-auto px-4 py-20 border-t border-zinc-900 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.015)_0%,transparent_50%)]">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[9px] font-mono text-red-500 font-black uppercase tracking-widest">Industry Deployments</span>
          <h2 className="text-2xl sm:text-4xl font-sans font-black text-white tracking-tight">
            Tailored Security Solutions & Use Cases
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
            See how organizations deploy Watchtower AI to protect physical assets, civil site borders, and sovereign network operations.
          </p>
        </div>

        {/* Use Cases Segment Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {useCasesList.map((uc) => (
            <button
              key={uc.id}
              onClick={() => setSelectedUseCase(uc.id)}
              className={`p-2.5 px-4 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                selectedUseCase === uc.id
                  ? 'bg-red-950/20 border-red-500 text-white shadow-xl shadow-red-950/10'
                  : 'bg-zinc-90 w-auto bg-zinc-900/40 hover:bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white'
              }`}
            >
              {uc.title}
            </button>
          ))}
        </div>

        {/* Selected Use Case Showcase Box */}
        {(() => {
          const activeCase = useCasesList.find(uc => uc.id === selectedUseCase) || useCasesList[0];
          return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-zinc-900/45 border border-zinc-800 rounded-2xl p-6 sm:p-10 text-left hover:border-zinc-700/50 transition">
              
              {/* Left Case explanation (Col-span 7) */}
              <div className="md:col-span-7 flex flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 py-1">
                    <span className="bg-red-550 border border-red-500 text-white font-mono text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {activeCase.badge}
                    </span>
                    <span className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Target Use Case</span>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">{activeCase.title}</h3>
                  <p className="text-xs font-mono text-zinc-300 leading-normal font-bold bg-zinc-950 p-2.5 border-l-2 border-red-550 rounded-r-lg">
                    {activeCase.subtitle}
                  </p>
                  
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans mt-2">
                    {activeCase.description}
                  </p>
                </div>

                {/* Core metrics features */}
                <div className="space-y-2">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-black block">Operational Safeguards</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeCase.metrics.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-zinc-300 font-mono text-[9px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Case highlight stats (Col-span 5) */}
              <div className="md:col-span-5 bg-zinc-950 rounded-xl p-6 border border-zinc-850 flex flex-col justify-between text-left space-y-6">
                <div>
                  <span className="text-zinc-650 block text-[8px] font-mono uppercase tracking-widest font-bold">Key Success Metric</span>
                  <div className="text-2xl sm:text-3xl font-sans font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-450 mt-1">
                    {activeCase.stat}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal mt-2">
                    Evaluated by independent technical compliance officers during internal deployments over 12 months.
                  </p>
                </div>

                {/* Simulated Success Checklist */}
                <div className="space-y-3 pt-6 border-t border-zinc-900 font-mono text-[9px]">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Administrative audit burden:</span>
                    <strong className="text-emerald-400">Reduced by 85%</strong>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Supervisor review speed:</span>
                    <strong className="text-emerald-400">Instant Alerting</strong>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Evasion spoof resistance:</span>
                    <strong className="text-emerald-400">100% Locked</strong>
                  </div>
                </div>

                <div className="text-[9px] font-mono text-zinc-600 uppercase flex items-center gap-1.5 justify-center bg-zinc-900/50 py-2 border border-zinc-850 rounded">
                  <UserCheck className="w-3.5 h-3.5 text-red-500" />
                  <span>Deployment: Ready to Host</span>
                </div>

              </div>

            </div>
          );
        })()}
      </section>

      {/* 6. Premium Interactive ROI Estimator */}
      <section id="roi" className="max-w-5xl mx-auto px-4 py-20 border-t border-zinc-900 bg-[radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.012)_0%,transparent_50%)]">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[9px] font-mono text-indigo-400 font-black uppercase tracking-widest">BUSINESS CASE ESTIMATOR</span>
          <h2 className="text-2xl sm:text-4xl font-sans font-black text-white tracking-tight">
            Calculate Compliance Savings & Value
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Drag the parameters below to project potential security hours saved, compliance scores, and auditing cost reductions.
          </p>
        </div>

        {/* ROI Calculator Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden p-6 sm:p-10 text-left shadow-2xl">
          
          {/* Left Sliders input columns (Col-span 7) */}
          <div className="md:col-span-7 space-y-6">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-zinc-850">
              <Calculator className="w-4 h-4 text-red-500" />
              Adjust Organization Fleet Numbers
            </h3>

            {/* Slider 1: Active Staff */}
            <div className="space-y-2 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
              <div className="flex items-center justify-between font-mono text-[9px]">
                <span className="text-zinc-500 uppercase font-bold">Patrolling Field Staff Size</span>
                <strong className="text-white text-xs">{numStaff} workers</strong>
              </div>
              <input 
                type="range"
                min="10"
                max="500"
                step="5"
                value={numStaff}
                onChange={(e) => setNumStaff(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <div className="flex justify-between text-[7.5px] font-mono text-zinc-650">
                <span>10 Personnel</span>
                <span>500 Personnel</span>
              </div>
            </div>

            {/* Slider 2: Incidents per month */}
            <div className="space-y-2 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
              <div className="flex items-center justify-between font-mono text-[9px]">
                <span className="text-zinc-500 uppercase font-bold">Uncertified Incidents / Month</span>
                <strong className="text-white text-xs">{averageIncidentsPerMonth} events</strong>
              </div>
              <input 
                type="range"
                min="2"
                max="50"
                step="1"
                value={averageIncidentsPerMonth}
                onChange={(e) => setAverageIncidentsPerMonth(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[7.5px] font-mono text-zinc-650">
                <span>Min limits (2)</span>
                <span>Moderate/High scale (50)</span>
              </div>
            </div>

            {/* Slider 3: Audit review time */}
            <div className="space-y-2 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
              <div className="flex items-center justify-between font-mono text-[9px]">
                <span className="text-zinc-500 uppercase font-bold">Average Incident Handling Duration</span>
                <strong className="text-white text-xs">{(averageMinutesPerIncident / 60).toFixed(1)} hrs</strong>
              </div>
              <input 
                type="range"
                min="30"
                max="360"
                step="10"
                value={averageMinutesPerIncident}
                onChange={(e) => setAverageMinutesPerIncident(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[7.5px] font-mono text-zinc-650">
                <span>0.5 hours</span>
                <span>6.0 hours</span>
              </div>
            </div>

          </div>

          {/* Right savings stats display (Col-span 5) */}
          <div className="md:col-span-5 bg-zinc-950 p-6 sm:p-8 rounded-xl border border-zinc-855 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <span className="text-zinc-650 block text-[8px] font-mono uppercase tracking-widest font-extrabold">Estimated Monthly Returns</span>
              
              <div className="space-y-0.5">
                <div className="text-3xl sm:text-4xl font-black font-sans text-emerald-400">
                  + {monthlyHoursSaved} hrs
                </div>
                <p className="text-[10px] font-mono text-zinc-450 uppercase">Safety & Audit Operations Freed</p>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex items-center justify-between font-mono text-[10px]">
                <span className="text-zinc-500">Projected Financial Recovery:</span>
                <strong className="text-white text-xs font-bold">${estimatedSavingsInUSD.toLocaleString()} / mo</strong>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[8px] text-zinc-550 uppercase">
                <span>Compliance audit velocity</span>
                <span>{riskMitigationScore}% score</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${riskMitigationScore}%` }}
                />
              </div>
              <p className="text-[8px] font-mono text-zinc-550 uppercase tracking-wide leading-tight">
                * Savings calculated based on conservative industry blending averages of $42/hour on administrative audits and incident liabilities.
              </p>
            </div>

            <button
              onClick={onLaunchAdminPortal}
              className="w-full py-2.5 bg-red-650 hover:bg-red-550 border border-red-500 text-white rounded-lg text-center font-bold font-mono text-[9px] uppercase tracking-wider transition cursor-pointer"
            >
              Configure Live Dashboard Settings
            </button>
          </div>

        </div>
      </section>

      {/* 7. FAQ Accordion Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 py-20 border-t border-zinc-900">
        <div className="text-center space-y-3 mb-12">
          <span className="text-[9px] font-mono text-zinc-500 font-extrabold uppercase tracking-widest">FREQUENT QUESTIONS</span>
          <h2 className="text-2xl sm:text-3xl font-sans font-black text-white tracking-tight">
            Watchtower Security Architecture FAQ
          </h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Everything you need to understand about our custom hardware verification tokens, geofence loops, and telemetry logging databases.
          </p>
        </div>

        {/* Custom Accordion widget */}
        <div className="space-y-4 text-left">
          {faqsList.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div 
                key={index} 
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full p-5 flex items-center justify-between text-left font-sans font-bold text-sm text-white hover:text-red-400 transition cursor-pointer"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-500' : ''}`} />
                </button>
                
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-zinc-900 font-sans">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Call to Action Web Footer */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-zinc-900 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="space-y-4 max-w-xl mx-auto">
          <div className="w-10 h-10 rounded-xl bg-red-650 flex items-center justify-center font-black text-white text-lg tracking-tight shadow-xl mx-auto transform rotate-6 mb-4">
            TS
          </div>
          
          <h2 className="text-xl sm:text-3xl font-sans font-black text-white tracking-tight uppercase">
            Deploy Evron Watchtower Today
          </h2>
          
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Protect high-value zones, secure sovereign facilities, and audit field worker locations. Fully offline autonomous support ready for direct integration.
          </p>

          <div className="pt-6">
            <button
              onClick={onLaunchAdminPortal}
              className="p-3 px-8 bg-red-650 hover:bg-red-550 border border-red-500 text-white rounded-xl font-black font-mono text-[10px] uppercase tracking-widest transition cursor-pointer inline-flex items-center gap-2 shadow-2xl shadow-red-950/65"
            >
              Enter Corporate System Panel
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimal Footer Signature copyrights */}
        <div className="pt-16 mt-16 border-t border-zinc-90 w-full flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[9px] text-zinc-600">
          <span>© 2026 EVRON NETWORKS CORP. WATCHTOWER AI IS STRICTLY PROTECTED BY GLOBAL SAFETY & CIVIL DEFENSE PATENTS.</span>
          <div className="flex gap-4">
            <span className="hover:text-zinc-400 transition cursor-pointer">PRIVACY SYSTEM</span>
            <span className="hover:text-zinc-400 transition cursor-pointer">LEGAL PROTOCOLS</span>
          </div>
        </div>
      </section>

    </div>
  );
}
