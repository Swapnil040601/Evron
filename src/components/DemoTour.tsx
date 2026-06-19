import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Tv, 
  X, 
  Activity, 
  Camera, 
  Monitor, 
  FileCheck, 
  ShieldAlert, 
  ArrowRight, 
  Smartphone, 
  CornerDownRight, 
  Sliders,
  Sparkles,
  Zap,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DemoTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tabName: 'Dashboard' | 'Attendance' | 'Leave' | 'Live' | 'More' | 'Day Summary' | 'Users', subTool?: string | null) => void;
}

interface Chapter {
  id: number;
  title: string;
  icon: React.ReactNode;
  duration: number; // in seconds
  description: string;
  steps: {
    time: number; // point in chapter timeline
    subtitle: string;
    actionLabel?: string;
    animationState: string;
  }[];
}

export default function DemoTour({ isOpen, onClose, onNavigateToTab }: DemoTourProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [scannedFaceStep, setScannedFaceStep] = useState(0); // For Scan animation simulation
  const [audioBeeps, setAudioBeeps] = useState(true);

  // Chapters of our high-fidelity app simulation "screencast"
  const chapters: Chapter[] = [
    {
      id: 1,
      title: 'Biometric Clock-In',
      icon: <Camera className="w-4 h-4" />,
      duration: 10,
      description: 'See how staff members authenticate and log their shift records securely using device biometrics.',
      steps: [
        { time: 0, subtitle: 'Welcome to Evron WatchTower v2.0. Let\'s demonstrate staff clock-in functions.', animationState: 'idle' },
        { time: 2, subtitle: 'When a staff member opens their user portal, they use their device biometric to authenticate...', animationState: 'scanning' },
        { time: 5, subtitle: 'The device verifies the fingerprint or face ID securely.', animationState: 'analyzing' },
        { time: 7.5, subtitle: 'Identity verified successfully! The portal automatically logs the present status with a UTC timestamp.', animationState: 'success' }
      ]
    },
    {
      id: 2,
      title: 'Live CCTV Surveillance Grid',
      icon: <Monitor className="w-4 h-4" />,
      duration: 12,
      description: 'Integrate live camera streams, real-time alert triggers, and perimeter breach monitoring.',
      steps: [
        { time: 0, subtitle: 'Next, we look at the live unified CCTV Security system. Managers can oversee multiple portals.', animationState: 'idle' },
        { time: 3, subtitle: 'When a perimeter barrier breach or abnormal thermal activity triggers, a warning state flashes.', animationState: 'breach_start' },
        { time: 6, subtitle: 'The system highlights the active threat feed with a visual siren status overlay.', animationState: 'breach_highlight' },
        { time: 9, subtitle: 'Security personnel can dismiss active alarms once the checkpoint is manually verified.', animationState: 'breach_clear' }
      ]
    },
    {
      id: 3,
      title: 'Bulk Imports & Registry Sync',
      icon: <FileCheck className="w-4 h-4" />,
      duration: 11,
      description: 'Manage staff databases, import bulk CSV user logs, and build synchronized directory databases.',
      steps: [
        { time: 0, subtitle: 'Let\'s demonstrate the administrative database compiling and data sync system.', animationState: 'idle' },
        { time: 2.5, subtitle: 'Administrators can open their Admin tools and click "Reports Engine" to import records.', animationState: 'opening_reports' },
        { time: 5.5, subtitle: 'Clicking "Sync Simulator Registry" triggers real-time compiling of records across local states.', animationState: 'syncing_data' },
        { time: 8.5, subtitle: 'All staff data variables reconciled on local and server logs within 15 milliseconds!', animationState: 'sync_complete' }
      ]
    },
    {
      id: 4,
      title: 'Hardware Lockout & Compliance',
      icon: <Smartphone className="w-4 h-4" />,
      duration: 10,
      description: 'A sandbox security lockout demo illustrating safety compliance on rooted/developer hardware.',
      steps: [
        { time: 0, subtitle: 'WatchTower enforces strict high-security corporate network guidelines on staff terminals.', animationState: 'idle' },
        { time: 2.5, subtitle: 'If a staff phone runs with Debugging or Developer Options enabled, the application locks down.', animationState: 'lockout_warning' },
        { time: 6, subtitle: 'The screen isolates itself to avoid potential remote telemetry or keystroke sniffing.', animationState: 'isolated_state' },
        { time: 8.5, subtitle: 'Deactivating Developer options on our simulation sidebar instantly restores working status!', animationState: 'restore_state' }
      ]
    },
    {
      id: 5,
      title: 'Smart Canteen & Shifts',
      icon: <Clock className="w-4 h-4" />,
      duration: 11,
      description: 'Meal scheduling and roster rules, shifts adjustments, and automated canteen token codes.',
      steps: [
        { time: 0, subtitle: 'Under our admin systems, the platform manages cafeterias and rosters.', animationState: 'idle' },
        { time: 3, subtitle: 'Employees can order digital lunch tickets. The portal generates unique, secure token codes.', animationState: 'token_generation' },
        { time: 6.5, subtitle: 'Simultaneously, HR can set buffer grace periods for night shifts or custom roster blocks.', animationState: 'shift_setting' },
        { time: 9, subtitle: 'WatchTower merges attendance data with shift logs to prevent billing inaccuracies.', animationState: 'summary' }
      ]
    }
  ];

  const currentChapter = chapters[currentChapterIndex];

  // Sound generator simulation (synthesizer tones)
  const playPulseSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (isMuted || !audioBeeps) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context blocked
    }
  };

  // Timeline progression core hook
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && isOpen) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          const nextVal = prev + 0.1 * playbackSpeed;
          if (nextVal >= currentChapter.duration) {
            // Chapter complete! Advance to next chapter or cycle back
            if (currentChapterIndex < chapters.length - 1) {
              playPulseSound(587.33, 0.4); // advance chime
              setCurrentChapterIndex(prevIdx => prevIdx + 1);
              return 0;
            } else {
              playPulseSound(523.25, 0.5); // finished loop chime
              setCurrentChapterIndex(0);
              return 0;
            }
          }
          return nextVal;
        });
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentChapterIndex, playbackSpeed, isOpen, currentChapter]);

  // Face scanner state transitions
  useEffect(() => {
    if (currentChapterIndex === 0) {
      if (currentTime > 7.5) {
        if (scannedFaceStep !== 3) {
          setScannedFaceStep(3);
          playPulseSound(880, 0.45); // success beep
        }
      } else if (currentTime > 5) {
        if (scannedFaceStep !== 2) {
          setScannedFaceStep(2);
          playPulseSound(440, 0.1, 'triangle');
        }
      } else if (currentTime > 2) {
        if (scannedFaceStep !== 1) {
          setScannedFaceStep(1);
          playPulseSound(330, 0.15, 'sine');
        }
      } else {
        setScannedFaceStep(0);
      }
    }
  }, [currentTime, currentChapterIndex]);

  // Trigger audio support on chapter swap
  useEffect(() => {
    if (isOpen) {
      playPulseSound(261.63, 0.15); // soft focus transition
    }
  }, [currentChapterIndex, isOpen]);

  if (!isOpen) return null;

  // Determine active step based on current chapter time
  const activeStep = currentChapter.steps.reduce((acc, step) => {
    if (currentTime >= step.time) {
      return step;
    }
    return acc;
  }, currentChapter.steps[0]);

  // Command button action clicker
  const handleTryNow = () => {
    setIsPlaying(false);
    playPulseSound(659.25, 0.12);
    
    if (currentChapterIndex === 0) {
      // Go to User Portal
      onClose();
      onNavigateToTab('Attendance');
    } else if (currentChapterIndex === 1) {
      // Go to Live CCTV
      onClose();
      onNavigateToTab('Live');
    } else if (currentChapterIndex === 2) {
      // Go to Reports Engine
      onClose();
      onNavigateToTab('More', 'Reports');
    } else if (currentChapterIndex === 3) {
      // Go to Devices simulator info
      onClose();
      onNavigateToTab('Dashboard');
      // Set highlighting or notification
    } else if (currentChapterIndex === 4) {
      // Go to Smart canteen
      onClose();
      onNavigateToTab('More', 'Canteen');
    }
  };

  const handleSeek = (newVal: number) => {
    playPulseSound(440, 0.05);
    setCurrentTime(newVal);
  };

  const handlePrevChapter = () => {
    playPulseSound(349.23, 0.1);
    setCurrentChapterIndex((prev) => (prev > 0 ? prev - 1 : chapters.length - 1));
    setCurrentTime(0);
  };

  const handleNextChapter = () => {
    playPulseSound(392.00, 0.1);
    setCurrentChapterIndex((prev) => (prev < chapters.length - 1 ? prev + 1 : 0));
    setCurrentTime(0);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 overflow-y-auto p-4 flex justify-center items-start md:items-center" id="guided-tour-modal">
      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-850 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
        
        {/* Left Side: Walkthrough Playlist */}
        <div className="w-full md:w-80 bg-zinc-900/60 border-b md:border-b-0 md:border-r border-zinc-900 p-5 shrink-0 flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold font-mono tracking-wider uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Video Walkthrough</span>
              </div>
              <h2 className="text-lg font-bold text-white font-sans tracking-tight">Interactive Cinema</h2>
              <p className="text-[11px] text-zinc-400 mt-1">Let us showcase the core functions of the Evron WatchTower operations hub.</p>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-bold text-zinc-500 font-mono tracking-widest uppercase">CHAPTER MENU</span>
              <div className="space-y-1.5" id="tour-chapters-listing">
                {chapters.map((chap, idx) => (
                  <button
                    key={chap.id}
                    onClick={() => {
                      setCurrentChapterIndex(idx);
                      setCurrentTime(0);
                    }}
                    className={`w-full p-2.5 rounded-lg border text-left text-xs font-mono transition flex items-center gap-3 relative overflow-hidden group ${
                      idx === currentChapterIndex 
                        ? 'bg-red-950/20 border-red-500/20 text-white font-semibold' 
                        : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800/40 hover:text-white'
                    }`}
                  >
                    {idx === currentChapterIndex && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
                    )}
                    <div className={`p-1.5 rounded-md ${
                      idx === currentChapterIndex ? 'bg-red-650/20 text-red-400' : 'bg-zinc-950 border border-zinc-850 text-zinc-500 group-hover:text-zinc-300'
                    }`}>
                      {chap.icon}
                    </div>
                    <div className="flex-1 truncate">
                      <div className="truncate text-[11px] font-bold uppercase tracking-wider">{chap.title}</div>
                      <div className="text-[9px] text-zinc-500 font-sans truncate mt-0.5">{chap.duration}s duration • Auto simulation</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-900 space-y-2 mt-4 md:mt-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>Sound Feedback</span>
              <button 
                onClick={() => setAudioBeeps(!audioBeeps)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${audioBeeps ? 'bg-red-950/30 text-red-400 border border-red-900/10' : 'bg-zinc-950 text-zinc-600 border border-zinc-900'}`}
              >
                {audioBeeps ? 'ACTIVE' : 'MUTED'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Media Player & Live Graphics Display */}
        <div className="flex-1 flex flex-col justify-between min-w-0" id="media-player-container">
          
          {/* Header Controls */}
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
              <div className="truncate">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider truncate">
                  Now Boarding: Chapter {currentChapter.id} of {chapters.length}
                </h3>
                <p className="text-[10px] text-zinc-400 font-sans truncate">{currentChapter.description}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition cursor-pointer"
              title="Close Walkthrough Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Interactive Simulation CRT TV Screen */}
          <div className="flex-1 bg-zinc-950 p-6 flex flex-col items-center justify-center relative min-h-[300px]">
            {/* Ambient Screen Grid scanline effects */}
            <div className="absolute inset-0 bg-radial-vignette pointer-events-none opacity-40" />
            <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-10" />

            {/* SCREEN COMPONENT LIVE RENDERING (Simulated Screencast Animations) */}
            <div className="w-full max-w-md bg-zinc-90 w-full bg-zinc-900/60 border border-zinc-850 rounded-xl p-5 shadow-2xl relative min-h-[220px] flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03)_0%,transparent_60%)] pointer-events-none" />
              
              <AnimatePresence mode="wait">
                {/* Visualizer Frame for Chapter 1: Biometric Face Scan */}
                {currentChapterIndex === 0 && (
                  <motion.div 
                    key="chap-1"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-red-500" />
                        <span className="text-[10px] font-mono text-zinc-300">Biometric Terminal // Camera Slot B</span>
                      </div>
                      <span className="text-[9px] font-mono bg-zinc-950 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-850">0.0.0.0 HOST</span>
                    </div>

                    <div className="flex items-center gap-4 py-1">
                      {/* Interactive Biometric Face Ring */}
                      <div className="relative w-20 h-20 rounded-xl border border-zinc-800 bg-black flex items-center justify-center overflow-hidden shrink-0">
                        <img 
                          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200" 
                          alt="Face Preview" 
                          className="w-full h-full object-cover opacity-60"
                        />
                        
                        {/* Scanning wireframe grid overlays */}
                        {scannedFaceStep >= 1 && scannedFaceStep < 3 && (
                          <motion.div 
                            initial={{ top: 0 }}
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            className="absolute left-0 right-0 h-0.5 bg-red-400 opacity-80"
                          />
                        )}

                        {scannedFaceStep === 1 && (
                          <div className="absolute inset-2 border border-dashed border-red-500/40 rounded-full animate-spin" style={{ animationDuration: '6s' }} />
                        )}

                        {scannedFaceStep === 2 && (
                          <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                            <span className="text-[9px] font-mono text-red-400 font-bold bg-black/80 px-1 rounded animate-pulse">GRIDPING</span>
                          </div>
                        )}

                        {scannedFaceStep === 3 && (
                          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                            <div className="bg-emerald-600 p-1 rounded-full text-white animate-scaleIn">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Staff Bio Info Details Card */}
                      <div className="flex-1 space-y-2">
                        <div className="space-y-0.5">
                          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">Sarah Jenkins</h4>
                          <p className="text-[9px] text-zinc-500 font-sans">Lead Security Architect // Systems Dept</p>
                        </div>
                        
                        {/* Interactive scan feedback details */}
                        <div className="space-y-1 font-mono text-[9px]">
                          <div className="flex justify-between items-center bg-zinc-950 p-1 rounded px-2">
                            <span className="text-zinc-600">STATE:</span>
                            {scannedFaceStep === 0 && <span className="text-zinc-400">STANDBY</span>}
                            {scannedFaceStep === 1 && <span className="text-red-450 animate-pulse">ALIGNING OBJECT...</span>}
                            {scannedFaceStep === 2 && <span className="text-amber-400 animate-pulse">EXAMINING MESH...</span>}
                            {scannedFaceStep === 3 && <span className="text-emerald-400 font-bold">VERIFIED PRESENT</span>}
                          </div>

                          <div className="flex justify-between items-center bg-zinc-950 p-1 rounded px-2">
                            <span className="text-zinc-600">CONFIDENCE:</span>
                            <span className="text-zinc-200">
                              {scannedFaceStep >= 2 ? '99.8%' : '0.0%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Visualizer Frame for Chapter 2: CCTV Streams Breach */}
                {currentChapterIndex === 1 && (
                  <motion.div 
                    key="chap-2"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-3.5"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="text-[10px] font-mono text-zinc-350">CCTV WatchTower Monitors (3 streams active)</span>
                      </div>
                      <span className="text-[9px] font-mono text-rose-500 font-bold bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-900/10">ALERT CONTROLLERS</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className={`p-2 bg-black border rounded-lg transition relative overflow-hidden ${
                        currentTime >= 3 && currentTime < 9 ? 'border-red-500 bg-red-950/5' : 'border-zinc-850'
                      }`}>
                        {currentTime >= 3 && currentTime < 9 && (
                          <div className="absolute top-1.5 right-1.5 bg-red-600 text-white font-mono text-[6px] font-bold px-1 rounded animate-pulse shadow">ALARM BREACH</div>
                        )}
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-mono text-zinc-500">CAM-01 Lobby</span>
                        <div className="aspect-video bg-zinc-950/80 rounded border border-zinc-900 flex items-center justify-center">
                          <Activity className={`w-4 h-4 ${currentTime >= 3 && currentTime < 9 ? 'text-red-500 animate-bounce' : 'text-zinc-700'}`} />
                        </div>
                      </div>

                      <div className="p-2 bg-black border border-zinc-855 rounded-lg relative">
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-mono text-zinc-500">CAM-02 Barrier</span>
                        <div className="aspect-video bg-zinc-950/80 rounded border border-zinc-900 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-zinc-700" />
                        </div>
                      </div>
                    </div>

                    {/* Simmulating manual action alert */}
                    <div className="p-2.5 bg-zinc-950 border border-zinc-900 rounded-lg text-[9px] font-mono flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {currentTime >= 3 && currentTime < 9 ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-zinc-800" />
                        )}
                        <span className="text-zinc-300">
                          {currentTime < 3 && 'Monitoring silent fence sectors...'}
                          {currentTime >= 3 && currentTime < 9 && '[ALERT] CAM-01 Lobby: thermal threat detected!'}
                          {currentTime >= 9 && 'Alert auto-dismissed & recorded.'}
                        </span>
                      </div>
                      {currentTime >= 3 && currentTime < 9 && (
                        <span className="text-[7.5px] font-bold bg-white text-black px-1.5 rounded animate-bounce">TRIGGER TEST</span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Visualizer Frame for Chapter 3: Data Compilers Sync */}
                {currentChapterIndex === 2 && (
                  <motion.div 
                    key="chap-3"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-pink-400" />
                        <span className="text-[10px] font-mono text-zinc-350">Registry Compiler and CSV Engine</span>
                      </div>
                    </div>

                    <div className="bg-black/80 rounded-lg p-3 font-mono text-[9px] space-y-1 text-zinc-400 border border-zinc-900 min-h-[100px] flex flex-col justify-between">
                      <div className="space-y-1">
                        <div>$ npm run sync-simulator:db</div>
                        {currentTime >= 2.5 && (
                          <div className="text-amber-500 select-all animate-pulse">➔ Initializing CSV import stream parser...</div>
                        )}
                        {currentTime >= 5.5 && (
                          <div className="text-pink-400 animate-fadeIn">➔ Read 5 rows. Executing user registry inserts:</div>
                        )}
                        {currentTime >= 8.5 && (
                          <div className="text-emerald-400 font-bold animate-fadeIn">➔ Sync reconciled. Status OK! matched variables.</div>
                        )}
                      </div>

                      <div className="h-1 bg-zinc-900 rounded overflow-hidden">
                        {currentTime >= 5.5 && (
                          <motion.div 
                            initial={{ width: '0%' }}
                            animate={{ width: currentTime >= 8.5 ? '100%' : '60%' }}
                            className="h-full bg-pink-500"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[8.5px] font-mono text-zinc-500">
                      <span>Matched ID Key: "Swapnil Rathore" [EMP-EVN-201]</span>
                      <span className="text-zinc-650">XLS Sync Capable</span>
                    </div>
                  </motion.div>
                )}

                {/* Visualizer Frame for Chapter 4: Hardware Compliance Lock */}
                {currentChapterIndex === 3 && (
                  <motion.div 
                    key="chap-4"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-1.5 border-b border-zinc-850 pb-2 text-[10px] font-mono text-zinc-350 uppercase">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-500 animate-bounce" />
                      <span>Security Sandbox Compliance Lock</span>
                    </div>

                    {currentTime < 2.5 && (
                      <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-lg text-center font-mono text-[9px] text-zinc-500 py-8">
                        Simulating device compliance test...
                      </div>
                    )}

                    {currentTime >= 2.5 && currentTime < 8.5 && (
                      <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-lg text-center space-y-2.5 animate-fadeIn">
                        <div className="inline-flex p-1 bg-red-650/15 rounded text-red-500">
                          <ShieldAlert className="w-5 h-5 shrink-0" />
                        </div>
                        <h5 className="text-[10.5px] font-bold text-white font-mono uppercase tracking-wide">SECURITY COMPLIANCE LOCKOUT</h5>
                        <p className="text-[8.5px] text-zinc-400 leading-relaxed font-sans max-w-xs mx-auto">
                          Developer Options detected on staff device. System modules isolated to secure credentials from trace telemetry.
                        </p>
                      </div>
                    )}

                    {currentTime >= 8.5 && (
                      <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg text-center space-y-2 animate-fadeIn">
                        <div className="inline-flex p-1 bg-emerald-600/15 rounded text-emerald-400">
                          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <h5 className="text-[10.5px] font-bold text-white font-mono uppercase tracking-wide">COMPLIANCE CLEARED</h5>
                        <p className="text-[8.5px] text-zinc-400 font-sans">
                          Option deactivated. Workspace restored successfully.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Visualizer Frame for Chapter 5: Smart Canteen */}
                {currentChapterIndex === 4 && (
                  <motion.div 
                    key="chap-5"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-mono text-zinc-350">Subsystem: Cafeteria & Shifts</span>
                      </div>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                        <span>Canteen Token Request:</span>
                        <span className="text-zinc-650">Meal Type: Lunch</span>
                      </div>

                      <div className="flex items-center justify-center p-3 bg-black border border-dashed border-zinc-850 rounded-lg">
                        {currentTime >= 3 && currentTime < 9 ? (
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center space-y-1 font-mono"
                          >
                            <span className="text-[10px] text-emerald-400 font-black tracking-widest bg-emerald-950/20 px-2.5 py-1 rounded select-all border border-emerald-900/10">TOK-LUNCH-88402</span>
                            <div className="text-[7.5px] text-zinc-500 mt-1 uppercase">Valid for 30 mins</div>
                          </motion.div>
                        ) : (
                          <span className="text-[8.5px] text-zinc-650 font-mono">Generating unique QR token ticket...</span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 pt-0.5">
                        <span>Night rosters starts: 22:00</span>
                        <span>Grace Buffer: 15 mins</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Narrator Closed Captions Over Titles */}
              <div className="mt-4 p-2.5 bg-black/50 border border-zinc-850/60 rounded-lg text-[10px] leading-relaxed text-zinc-300 font-sans border-l-2 border-l-red-500 select-text">
                <p className="font-semibold text-white text-[9px] font-mono uppercase text-red-500 tracking-wide mb-0.5">Narrator Script:</p>
                {activeStep.subtitle}
              </div>
            </div>
          </div>

          {/* Video Controller & Seekers */}
          <div className="p-5 bg-zinc-900 border-t border-zinc-900 space-y-4">
            
            {/* Timeline slider bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span className="text-zinc-500">{currentTime.toFixed(1)}s elapsed</span>
                <span className="text-zinc-500">{currentChapter.duration}.0s total</span>
              </div>
              <div className="relative w-full h-1.5 bg-zinc-950 rounded overflow-hidden group/seek cursor-pointer">
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-red-650 transition-all duration-100"
                  style={{ width: `${(currentTime / currentChapter.duration) * 100}%` }}
                />
                <input 
                  type="range"
                  min="0"
                  max={currentChapter.duration}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Transport Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrevChapter}
                  className="p-1 px-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[10px] font-mono transition"
                  title="Previous Chapter"
                >
                  PREV
                </button>
                
                <button
                  onClick={() => {
                    playPulseSound(523.25, 0.08);
                    setIsPlaying(!isPlaying);
                  }}
                  className="p-2 bg-red-650 hover:bg-red-500 text-white rounded-xl transition flex items-center justify-center cursor-pointer shadow-md shadow-red-950/20"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-white" />
                  ) : (
                    <Play className="w-4 h-4 fill-white translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={handleNextChapter}
                  className="p-1 px-2.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[10px] font-mono transition"
                  title="Next Chapter"
                >
                  NEXT
                </button>

                <button
                  onClick={() => {
                    playPulseSound(440, 0.15);
                    setCurrentTime(0);
                  }}
                  className="p-1.5 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition"
                  title="Replay Current Chapter"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="h-4 w-[1px] bg-zinc-800" />

                {/* Speed indicator */}
                <div className="flex gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-850 font-mono text-[8px]">
                  {([1, 1.5, 2] as const).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded ${playbackSpeed === spd ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Sandbox Direct Trial Launcher (Perfect Craftsman addition) */}
              <button
                onClick={handleTryNow}
                className="btn-glass-red px-4 py-2 rounded-xl text-[10px] font-bold font-mono tracking-wider transition flex items-center justify-center gap-1.5 uppercase cursor-pointer"
              >
                <span>Try This Section Live</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
