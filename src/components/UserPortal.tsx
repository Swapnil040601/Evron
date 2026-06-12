/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import {
  UserProfile,
  LeaveApplication,
  LeaveBalance,
  Holiday,
  AttendanceRecord,
  LeaveType
} from '../types';
import {
  Clock,
  Calendar,
  Sparkles,
  ClipboardList,
  User,
  LogOut,
  Plus,
  Trash2,
  CalendarDays,
  Camera,
  CheckCircle,
  AlertTriangle,
  FileText,
  Smartphone,
  Info,
  Sun,
  Moon,
  MapPin
} from 'lucide-react';
import DeviceSimulator, { getDeviceHardwareState } from './DeviceSimulator';
import AuraBackground from './AuraBackground';

interface UserPortalProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

export default function UserPortal({ currentUser, onLogout }: UserPortalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'home' | 'attendance' | 'leave' | 'holidays' | 'profile'>('home');

  // Sync sub-tab updates into browser history and listen to back button popstate
  useEffect(() => {
    localStorage.setItem('active-user-portal-tab', activeSubTab);
    
    const histState = window.history.state;
    if (histState && histState.userPortalTab !== activeSubTab) {
      window.history.pushState({
        ...histState,
        userPortalTab: activeSubTab
      }, '');
    }
  }, [activeSubTab]);

  useEffect(() => {
    const handleTabSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveSubTab(customEvent.detail);
      }
    };
    window.addEventListener('app-user-portal-tab', handleTabSync);
    return () => {
      window.removeEventListener('app-user-portal-tab', handleTabSync);
    };
  }, []);

  // Unified States
  const [profile, setProfile] = useState<UserProfile>(currentUser);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  // Theme support hooks
  const [themeTrigger, setThemeTrigger] = useState(0);

  useEffect(() => {
    const act = localStorage.getItem('app-theme') || 'dark';
    if (act === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [themeTrigger]);

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeTrigger(p => p + 1);
    };
    const handleNotchChangeCustom = () => {
      const val = localStorage.getItem('android-notch-setting') || 'auto';
      setNotchGuard(val as any);
    };
    window.addEventListener('theme-changed', handleThemeChange);
    window.addEventListener('notch-setting-changed', handleNotchChangeCustom);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
      window.removeEventListener('notch-setting-changed', handleNotchChangeCustom);
    };
  }, []);

  // Form States
  const [leaveTypeId, setLeaveTypeId] = useState<number>(1);
  const [fromDate, setFromDate] = useState('2026-06-01');
  const [toDate, setToDate] = useState('2026-06-02');
  const [reason, setReason] = useState('');
  const [isLop, setIsLop] = useState(false);
  const [numDays, setNumDays] = useState(2);

  // Profile Edit fields
  const [phone, setPhone] = useState(profile.phone);
  const [gender, setGender] = useState(profile.gender);
  const [name, setName] = useState(profile.name);

  // Status metrics
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'err'; msg: string } | null>(null);
  const [hwState, setHwState] = useState(getDeviceHardwareState());

  // Scroll tracking to show/hide lower menu
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const container = document.getElementById('user-portal-viewport');
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      
      if (currentScrollY <= 0) {
        setIsBottomNavVisible(true);
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up even 1px
        setIsBottomNavVisible(true);
      } else if (currentScrollY > lastScrollY.current + 5) {
        // Scrolling down
        setIsBottomNavVisible(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [activeSubTab]);

  useEffect(() => {
    setIsBottomNavVisible(true);
  }, [activeSubTab]);

  // Android notch position / display camera hole offset guard states
  const [notchGuard, setNotchGuard] = useState<'auto' | 'center' | 'left' | 'right' | 'none'>(() => (localStorage.getItem('android-notch-setting') as any) || 'auto');

  const notchPaddingClass = 
    notchGuard === 'center' ? 'pt-10' :
    notchGuard === 'left' ? 'pl-8' : 
    notchGuard === 'right' ? 'pr-8' :
    notchGuard === 'auto' ? 'pt-[env(safe-area-inset-top,20px)]' : '';

  // Multi-stage selfie triggers (Value Gold Security requirement)
  const [selfiePunchIn, setSelfiePunchIn] = useState<string | null>(localStorage.getItem('selfie_punch_in') || null);
  const [selfieDestination, setSelfieDestination] = useState<string | null>(localStorage.getItem('selfie_destination') || null);
  const [selfiePunchOut, setSelfiePunchOut] = useState<string | null>(localStorage.getItem('selfie_punch_out') || null);
  
  const [activeSelfieType, setActiveSelfieType] = useState<'punch_in' | 'destination' | 'punch_out' | null>(null);
  const [isSelfieCapturing, setIsSelfieCapturing] = useState(false);

  useEffect(() => {
    const handleHardwareChange = () => {
      setHwState(getDeviceHardwareState());
    };
    window.addEventListener('device-hardware-changed', handleHardwareChange);
    return () => {
      window.removeEventListener('device-hardware-changed', handleHardwareChange);
    };
  }, []);

  useEffect(() => {
    loadAllData();
  }, []);

  // Compute days difference for leave
  useEffect(() => {
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setNumDays(isNaN(diffDays) ? 1 : diffDays);
    }
  }, [fromDate, toDate]);

  const loadAllData = async () => {
    try {
      // 1. Profile
      const p = await apiService.getProfile();
      setProfile(p);
      setPhone(p.phone);
      setGender(p.gender);
      setName(p.name);

      // 2. Leaves
      const lRes = await apiService.getMyLeaves();
      setLeaves(lRes.rows);

      // 3. Balances
      const bRes = await apiService.getLeaveBalances();
      setBalances(bRes);

      // 4. Holidays
      const hRes = await apiService.getHolidays();
      setHolidays(hRes);

      // 5. Types
      const tRes = await apiService.getLeaveTypes();
      setLeaveTypes(tRes);

      // 6. Attendance roster
      const aRes = await apiService.getAttendanceList({
        from: '2026-05-01',
        to: '2026-05-31',
        user_id: p.id,
        status: null,
        search: '',
        page: 1,
        limit: 50
      });
      setAttendance(aRes.rows);

      // Today status logic looking for today 2026-05-24
      const matchingToday = aRes.rows.find(row => row.date === '2026-05-24');
      setTodayAttendance(matchingToday || null);
    } catch (err: any) {
      console.error(err);
      triggerBanner('err', 'Network sync error. Defaulted to cache parameters.');
    }
  };

  const triggerBanner = (type: 'success' | 'err', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  // Clock in simulator action
  const handleClockInOut = async () => {
    // GPS Status Gate Check
    const hw = getDeviceHardwareState();
    if (hw.gpsStatus === 'off') {
      triggerBanner('err', 'GPS signal link inactive! Under Evron high-security standards, you cannot submit biometric attendance check-ins with your device location off.');
      return;
    }

    setIsScanning(true);
    triggerBanner('success', 'Synthesizing face dimensions scanner matrix...');

    setTimeout(async () => {
      try {
        const nextStatus = todayAttendance?.status === 'Present' ? 'Absent' : 'Present';
        const remarks = nextStatus === 'Present' 
          ? `Face check-in camera bypass (${hw.latitude.toFixed(4)}, ${hw.longitude.toFixed(4)})` 
          : `Check out logged (${hw.latitude.toFixed(4)}, ${hw.longitude.toFixed(4)})`;
        
        let targetId = todayAttendance?.id;
        if (!targetId) {
          // generate random id or check first
          targetId = Math.floor(Math.random() * 900) + 100;
        }

        await apiService.updateAttendance(targetId, {
          status: nextStatus as any,
          remarks
        });

        // Report GPS log to backend in real time!
        try {
          await apiService.reportGpsLog({
            employeeId: profile?.code || 'EMP001',
            employeeName: profile?.name || 'Staff Member',
            avatar: profile?.avatar || 'avatars/1.jpg',
            lat: hw.latitude,
            lng: hw.longitude,
            accuracy: 10,
            status: nextStatus === 'Present' ? 'Present' : 'Absent',
            currentApp: hw.activeApp || 'Evron Watchtower',
            isAppViolating: hw.unauthorizedAppsInstalled,
            networkType: hw.internetType || 'wifi',
            wifiSsid: hw.wifiSsid,
            isSsidViolating: hw.unauthorizedAppsInstalled,
            isWearingUniform: true,
            statusDetail: remarks,
            isDeveloperModeOn: hw.developerMode,
            wifiBypassedOrAirplaneMode: hw.internetTracking === 'off'
          });
        } catch (gpsErr) {
          console.warn("Soft telemetry update offline:", gpsErr);
        }

        // Refresh
        await loadAllData();
        triggerBanner('success', `Dynamic biometric scan complete at Coordinates: [${hw.latitude.toFixed(4)}, ${hw.longitude.toFixed(4)}]! Marked as ${nextStatus}`);
      } catch (err: any) {
        triggerBanner('err', 'Failed to register surveillance scan log.');
      } finally {
        setIsScanning(false);
      }
    }, 2000);
  };

  const handleTriggerSelfie = (type: 'punch_in' | 'destination' | 'punch_out') => {
    const hw = getDeviceHardwareState();
    if (hw.gpsStatus === 'off') {
      triggerBanner('err', 'Biometric Camera Lock: GPS signal coordinates required to tie transit selfie.');
      return;
    }
    setActiveSelfieType(type);
    setIsSelfieCapturing(true);
  };

  const handleConfirmSelfie = () => {
    setIsSelfieCapturing(false);
    const hw = getDeviceHardwareState();
    const mockPhotoData = `Simulated Biometric Selfie - Latitude: ${hw.latitude.toFixed(4)}, Longitude: ${hw.longitude.toFixed(4)} at ${new Date().toLocaleTimeString()}`;
    
    if (activeSelfieType === 'punch_in') {
      setSelfiePunchIn(mockPhotoData);
      localStorage.setItem('selfie_punch_in', mockPhotoData);
      triggerBanner('success', '✅ PUNCH-IN selfie registered with localized lat/lng proof!');
    } else if (activeSelfieType === 'destination') {
      setSelfieDestination(mockPhotoData);
      localStorage.setItem('selfie_destination', mockPhotoData);
      triggerBanner('success', '✅ ROUTE DESTINATION selfie locked in securely!');
    } else if (activeSelfieType === 'punch_out') {
      setSelfiePunchOut(mockPhotoData);
      localStorage.setItem('selfie_punch_out', mockPhotoData);
      triggerBanner('success', '✅ PUNCH-OUT selfie captured and uploaded to activeCRM!');
    }
    setActiveSelfieType(null);
  };

  // Leave Submit Form
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.applyLeave({
        leave_type_id: leaveTypeId,
        from_date: fromDate,
        to_date: toDate,
        no_of_days: numDays,
        reason,
        is_lop: isLop
      });

      setReason('');
      await loadAllData();
      triggerBanner('success', 'Leave application successfully submitted for approval.');
    } catch {
      triggerBanner('err', 'Failed to submit leave application.');
    }
  };

  // Withdraw pending leaves
  const handleWithdrawLeave = async (id: number) => {
    try {
      await apiService.withdrawLeave(id);
      await loadAllData();
      triggerBanner('success', 'Leave request withdrawn.');
    } catch {
      triggerBanner('err', 'Cannot withdraw non-pending leave.');
    }
  };

  // Update Profile Info
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const pathProfile = await apiService.updateProfile({
        name,
        phone,
        gender
      });
      setProfile(pathProfile);
      triggerBanner('success', 'Profile parameters saved successfully.');
    } catch {
      triggerBanner('err', 'Profile patch request failed.');
    }
  };

  // File Upload Avatar Bypass
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await apiService.uploadAvatar(file);
      await loadAllData();
      triggerBanner('success', 'Avatar face-print updated completely!');
    } catch {
      triggerBanner('err', 'Direct avatar upload failed.');
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-transparent text-zinc-100 flex flex-col font-sans relative" id="user-portal-workspace">
      <AuraBackground />
      
      {/* Dynamic top notifications strip */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl border text-xs font-mono shadow-2xl flex items-center gap-2 animate-bounce ${
          notification.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' 
            : 'bg-red-950/80 border-red-500/40 text-rose-400'
        }`}>
          <Info className="w-4 h-4" />
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Top Header with dynamic android notch guard padding */}
      <header className={`bg-zinc-950 border-b border-zinc-900 px-4 py-3.5 md:px-6 transition-all duration-300 ${notchPaddingClass}`} id="user-portal-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-sm rotate-3 shadow-lg">
              EV
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-white uppercase font-sans leading-none">{profile.name}</h1>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-0.5 block">{profile.code} · USER PORTAL</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Soft inline theme toggling button */}
            <button
              type="button"
              onClick={() => {
                const isLight = document.documentElement.classList.contains('theme-light');
                if (isLight) {
                  document.documentElement.classList.remove('theme-light');
                  localStorage.setItem('app-theme', 'dark');
                } else {
                  document.documentElement.classList.add('theme-light');
                  localStorage.setItem('app-theme', 'light');
                }
                setThemeTrigger(p => p + 1);
                window.dispatchEvent(new Event('theme-changed'));
              }}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-805 border border-zinc-850 rounded-xl text-zinc-400 hover:text-white transition flex items-center justify-center cursor-pointer shrink-0"
              title="Toggle theme mode"
              id="staff-header-theme-toggle"
            >
              {document.documentElement.classList.contains('theme-light') ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-purple-400" />
              )}
            </button>

            <button
              onClick={onLogout}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-xl text-[11px] font-mono text-zinc-400 hover:text-white transition flex items-center gap-1 leading-none shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-500" />
              SIGN OUT
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Body Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:px-6 pb-28 overflow-y-auto" id="user-portal-viewport">
        
        {activeSubTab === 'home' && (
          <div className="space-y-6 animate-fadeIn" id="unboxed-secured-dashboard">
            
            {/* Top Security Banner: Alert Indicators instantly visible without nesting card */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-[#ef4444] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                  Value Gold Security Telemetry Active
                </span>
                <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">
                  Welcome back, {profile.name}!
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Shift ID: <strong className="text-black dark:text-zinc-200">V-GOLD-0900 (09:00 - 18:05)</strong></span>
                  <span>•</span>
                  <span>Terminal Bound: <strong className="text-black dark:text-zinc-200">{hwState.imeiLocked ? "IMEI-358941091244510" : "UNBOUND"}</strong></span>
                  <span>•</span>
                  <span>IP Guard: <strong className="text-black dark:text-emerald-400">192.168.1.182</strong></span>
                </div>
              </div>

              {/* Dynamic Warning Alerts - No generic boxes, elegant badge arrays */}
              <div className="flex flex-wrap gap-2.5">
                {/* Low Battery Warning alert */}
                {hwState.batteryLevel < 20 && (
                  <div className="px-3 py-2 bg-red-500/15 border border-red-500/40 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400 animate-pulse">
                    <span className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full inline-block animate-ping" />
                    <div>
                      <strong className="block font-bold">🔋 LOW BATTERY COMPLIANCE RISK</strong>
                      <span className="text-[10px] opacity-90">Level at {hwState.batteryLevel}%. Please plug in chargers.</span>
                    </div>
                  </div>
                )}

                {/* GPRS Fake App installation alert */}
                {hwState.unauthorizedAppsInstalled && (
                  <div className="px-3 py-2 bg-red-600/20 border border-red-500/60 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-300 animate-bounce">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <div>
                      <strong className="block font-bold">🚫 SECURITY SPOOF ALERT</strong>
                      <span className="text-[10px] opacity-90">Illegal GPRS/Mock tools detected on filesystem!</span>
                    </div>
                  </div>
                )}

                {/* GPS Status Gate */}
                {hwState.gpsStatus === 'off' && (
                  <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/45 rounded-xl flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 animate-pulse">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    <div>
                      <strong className="block font-bold mt-0.5 uppercase">Telemetry GPS Signal Lost</strong>
                      <span className="text-[10px] opacity-90">Turn on simulated device GPS to allow biometrics.</span>
                    </div>
                  </div>
                )}

                {/* Secure IMEI bound indicator */}
                {hwState.imeiLocked && (
                  <div className="px-3 py-1 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-400">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                    <span className="text-[10px] tracking-tight font-mono uppercase">IMEI Device Lock: SECURE</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Information Roster Layout (Flat, Unboxing concept) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Metrics & Shift Parameters (lg: 7) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Metrics Highlights (Flat divider rows, no boxed frames) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-800/60 pb-6">
                  
                  <div className="flex items-center justify-between p-1">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-wider block uppercase">PRODUCTIVE DUTY TODAY</span>
                      <span className="text-2xl font-mono font-black text-black dark:text-white mt-0.5 block">
                        {(attendance.filter(a => a.status === 'Present').reduce((total, a) => total + a.productive_hours, 0) || 0).toFixed(1)} hrs
                      </span>
                      <span className="text-[9px] text-zinc-400">Monthly surveillance summary</span>
                    </div>
                    <Clock className="w-10 h-10 text-red-500/15 flex-shrink-0" />
                  </div>

                  <div className="flex items-center justify-between p-1 border-t md:border-t-0 md:border-l border-zinc-800/40 md:pl-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-wider block uppercase">KM DRIVEN (ROUTE)</span>
                      <span className="text-2xl font-mono font-black text-[#ef4444] mt-0.5 block">
                        {hwState.kilometres} Kilometers
                      </span>
                      <span className="text-[9px] text-zinc-400">Real-time GPRS mileage odometer</span>
                    </div>
                    <MapPin className="w-10 h-10 text-red-500/15 flex-shrink-0" />
                  </div>

                  <div className="flex items-center justify-between p-1 border-t md:border-t-0 md:border-l border-zinc-800/40 md:pl-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-wider block uppercase">CO-STAFF INACTIVITY</span>
                      <span className={`text-2xl font-mono font-black mt-0.5 block ${hwState.idleMinutes > 15 ? 'text-amber-500' : 'text-emerald-400'}`}>
                        {hwState.idleMinutes} Minutes
                      </span>
                      <span className="text-[9px] text-zinc-400">Idle guard telemetry reporting</span>
                    </div>
                    <User className="w-10 h-10 text-amber-500/15 flex-shrink-0" />
                  </div>

                </div>

                {/* Primary Shift parameters (Unboxed text lists, highly readable typography) */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-black uppercase text-[#ef4444] tracking-widest flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-red-505" />
                    Assigned Shift Duty roster Parameters
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1 p-3 bg-zinc-900/10 border-l-2 border-red-500/40">
                      <strong className="block text-black dark:text-zinc-200">Standard Grace Threshold:</strong>
                      <span className="text-zinc-640 dark:text-zinc-400 leading-normal block">
                        Our 5x5ft Precious Checking Zone enforces strict biometric checkout timestamps, requiring precise time tracking.
                      </span>
                    </div>

                    <div className="space-y-1 p-3 bg-zinc-900/10 border-l-2 border-slate-500/40">
                      <strong className="block text-black dark:text-zinc-200">Device Attendance Verification:</strong>
                      <span className="text-zinc-640 dark:text-zinc-400 leading-normal block">
                        Verify your device is online during your scheduled shift to log hours.
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-950/5 border border-zinc-900/15 p-3 rounded-lg leading-relaxed">
                    <strong>Corporate Attendance Guideline:</strong> Ensure you check-in using your official registered device. Please keep your device sufficiently charged during work hours to ensure uninterrupted logging of shift timers.
                  </div>

                  {/* Android Notch Camera Guard Control */}
                  <div className="p-4 bg-zinc-900/20 border border-zinc-800/10 dark:border-zinc-850 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-red-500" />
                      <div>
                        <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wide">
                          Android Display & Camera Hole Calibrator
                        </h4>
                        <p className="text-[10px] text-zinc-500">
                          Align app layout boundaries to protect against physical camera notch and punch hole cutouts
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                      {[
                        { id: 'auto', label: '⚡ Auto Guard' },
                        { id: 'center', label: '🔘 Center Notch' },
                        { id: 'left', label: '👈 Left Punch' },
                        { id: 'right', label: '👉 Right Punch' },
                        { id: 'none', label: '📺 Full Screen' }
                      ].map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setNotchGuard(item.id as any);
                            localStorage.setItem('android-notch-setting', item.id);
                            window.dispatchEvent(new Event('notch-setting-changed'));
                          }}
                          className={`py-1.5 px-2 text-[9px] font-mono font-bold rounded-lg cursor-pointer transition uppercase flex items-center justify-center ${
                            notchGuard === item.id
                              ? 'bg-red-600 text-white shadow'
                              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-850'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="bg-zinc-950/45 p-2 rounded-lg border border-zinc-900/50 text-[9.5px] font-mono text-zinc-505 text-zinc-400 flex items-center justify-between">
                      <span>Status bar bounds adjustment:</span>
                      <strong className="text-red-400 uppercase">
                        {notchGuard === 'center' ? 'PAD-TOP +40PX' :
                         notchGuard === 'left' ? 'PAD-LEFT +32PX' :
                         notchGuard === 'right' ? 'PAD-RIGHT +32PX' :
                         notchGuard === 'auto' ? 'DEFAULT INSET-TOP ACTIVE' :
                         'TRUE FULL SCREEN'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Direct Logged Session quick status summary */}
                <div className="pt-4 border-t border-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Shift Status Checklist</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-3 h-3 rounded-full ${todayAttendance?.status === 'Present' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-sm font-bold text-black dark:text-white uppercase font-mono">
                        {todayAttendance?.status === 'Present' ? 'ACTIVE & CLOCKED ON-DUTY' : 'NOT CLOCKED IN'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleClockInOut}
                    disabled={isScanning || hwState.unauthorizedAppsInstalled || hwState.gpsStatus === 'off'}
                    className={`px-6 py-3 rounded-xl text-xs font-black font-mono tracking-wider flex items-center justify-center gap-2 uppercase transition-all shadow-xl leading-none cursor-pointer ${
                      hwState.unauthorizedAppsInstalled || hwState.gpsStatus === 'off'
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : isScanning 
                          ? 'bg-zinc-800 text-zinc-400 animate-pulse' 
                          : todayAttendance?.status === 'Present' 
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                            : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    {isScanning 
                      ? 'Aligning dimensions...' 
                      : hwState.unauthorizedAppsInstalled 
                        ? 'SPOOF LOCKED' 
                        : todayAttendance?.status === 'Present' 
                          ? 'BIO-CLOCK OUT' 
                          : 'BIO-CLOCK IN'}
                  </button>
                </div>

              </div>

              {/* Right Column: Multi-Stage Secure Location-Tied Selfies (lg: 5) */}
              <div className="lg:col-span-5 space-y-5 border-t lg:border-t-0 lg:border-l border-zinc-800/60 pt-6 lg:pt-0 lg:pl-6">
                
                <div className="space-y-1">
                  <h3 className="text-xs font-mono font-black uppercase text-[#ef4444] tracking-widest flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    Multi-Stage Selfie Verification
                  </h3>
                  <p className="text-[11px] text-zinc-650 dark:text-zinc-400 leading-normal">
                    Employees must snap verification selfies at 3 key milestones. Photo uploads are tagged with physical coordinates to prevent device spoofing.
                  </p>
                </div>

                {/* Vertical Stage Selectors */}
                <div className="space-y-3.5">
                  
                  {/* Stage 1: PUNCH IN SELFIE */}
                  <div className="flex items-center justify-between gap-4 p-3.5 bg-black/40 border border-zinc-900 rounded-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-650/10 border border-red-500 text-[10px] font-mono font-bold flex items-center justify-center text-[#ef4444]">1</span>
                        <h4 className="text-xs font-bold text-black dark:text-white uppercase leading-none">Punch-In Selfie</h4>
                      </div>
                      <span className="block text-[9.5px] text-zinc-500 font-mono leading-tight">
                        {selfiePunchIn ? "✅ SIGNED & UPLOADED" : "⚠️ PENDING PUNCH IN"}
                      </span>
                      {selfiePunchIn && (
                        <p className="text-[8px] text-emerald-400 leading-none truncate max-w-[180px] font-mono">
                          {selfiePunchIn}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleTriggerSelfie('punch_in')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider cursor-pointer ${
                        selfiePunchIn ? 'bg-zinc-900 border border-zinc-805 text-zinc-400 hover:text-white' : 'bg-red-650 hover:bg-red-500 text-white'
                      }`}
                    >
                      {selfiePunchIn ? 'RE-TAKE' : 'CAPTURE PHOTO'}
                    </button>
                  </div>

                  {/* Stage 2: TRANSIT TARGET ARRIVAL SELFIE */}
                  <div className="flex items-center justify-between gap-4 p-3.5 bg-black/40 border border-zinc-900 rounded-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-650/10 border border-red-500 text-[10px] font-mono font-bold flex items-center justify-center text-[#ef4444]">2</span>
                        <h4 className="text-xs font-bold text-black dark:text-white uppercase leading-none">Destination Arrival</h4>
                      </div>
                      <span className="block text-[9.5px] text-zinc-500 font-mono leading-tight">
                        {selfieDestination ? "✅ GPS TARGET SIGNED" : "⚠️ PENDING DESTINATION ROUTE"}
                      </span>
                      {selfieDestination && (
                        <p className="text-[8px] text-emerald-400 leading-none truncate max-w-[180px] font-mono">
                          {selfieDestination}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleTriggerSelfie('destination')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider cursor-pointer ${
                        selfieDestination ? 'bg-zinc-900 border border-zinc-805 text-zinc-400 hover:text-white' : 'bg-red-650 hover:bg-red-500 text-white'
                      }`}
                    >
                      {selfieDestination ? 'RE-TAKE' : 'CAPTURE PHOTO'}
                    </button>
                  </div>

                  {/* Stage 3: PUNCH OUT SELFIE */}
                  <div className="flex items-center justify-between gap-4 p-3.5 bg-black/40 border border-zinc-900 rounded-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-red-650/10 border border-red-500 text-[10px] font-mono font-bold flex items-center justify-center text-[#ef4444]">3</span>
                        <h4 className="text-xs font-bold text-black dark:text-white uppercase leading-none">Punch-Out Selfie</h4>
                      </div>
                      <span className="block text-[9.5px] text-zinc-500 font-mono leading-tight">
                        {selfiePunchOut ? "✅ TERMINAL COMPLETED" : "⚠️ PENDING DUTY PUNCH OUT"}
                      </span>
                      {selfiePunchOut && (
                        <p className="text-[8px] text-emerald-400 leading-none truncate max-w-[180px] font-mono">
                          {selfiePunchOut}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleTriggerSelfie('punch_out')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider cursor-pointer ${
                        selfiePunchOut ? 'bg-zinc-900 border border-zinc-805 text-zinc-400 hover:text-white' : 'bg-red-650 hover:bg-red-500 text-white'
                      }`}
                    >
                      {selfiePunchOut ? 'RE-TAKE' : 'CAPTURE PHOTO'}
                    </button>
                  </div>

                </div>

                <div className="bg-emerald-950/15 border border-emerald-900/30 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-400">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-ping flex-shrink-0" />
                  <span className="text-[10px] font-sans">
                    <strong>Fitlight Mode: ON.</strong> Localized device telemetry and spatial checks are currently broadcasting to Superadmin Watchtower console.
                  </span>
                </div>

              </div>

            </div>

            {/* Selfie Biometric Capture Simulation Modal */}
            {isSelfieCapturing && activeSelfieType && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden p-6 space-y-6 relative">
                  
                  {/* Decorative radar crosshair overlay */}
                  <div className="absolute inset-x-0 top-32 flex justify-center pointer-events-none select-none">
                    <div className="w-52 h-52 items-center justify-center rounded-full border border-dashed border-red-500/40 animate-spin flex">
                      <div className="w-40 h-40 rounded-full border border-red-500/20" />
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-[9px] font-mono uppercase bg-red-950/20 px-2 py-0.5 rounded border border-red-500/20 text-[#ef4444]">
                      BIOMETRIC STAMP PROTOCOL
                    </span>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">
                      Align face in viewfinder
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono uppercase">
                      SECURE COORDINATES STAMP LOGGED: [{hwState.latitude.toFixed(4)}°, {hwState.longitude.toFixed(4)}°]
                    </p>
                  </div>

                  {/* Simulated viewfinder screen */}
                  <div className="w-full h-64 bg-[#0d0d0d] border border-zinc-850 rounded-xl relative overflow-hidden flex flex-col items-center justify-center">
                    
                    {/* Glowing scanning bar */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500/80 shadow-lg shadow-red-500/50 animate-bounce z-10" />
                    
                    {/* Portrait head map silhouette */}
                    <div className="w-32 h-44 border-2 border-dashed border-red-500/40 rounded-full opacity-60 flex items-center justify-center">
                      <span className="text-red-500/60 font-mono text-[8px] tracking-widest text-center leading-normal">
                        FITLIGHT SCAN<br/>[READY]
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-zinc-950/95 border border-zinc-800 px-2.5 py-1 text-[8.5px] font-mono text-zinc-300 rounded uppercase">
                      SURVEILLANCE: ON · CAMERA v2.1
                    </div>

                    <div className="absolute top-3 right-3 bg-red-950/40 px-2 py-0.5 text-[8px] font-mono text-[#ef4444] rounded uppercase font-bold animate-pulse">
                      ● CAPTURING
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsSelfieCapturing(false);
                        setActiveSelfieType(null);
                      }}
                      className="flex-1 py-3 border border-zinc-800 hover:border-zinc-700 bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-bold font-mono tracking-wider transition uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmSelfie}
                      className="flex-1 py-3 bg-red-650 hover:bg-red-505 text-white bg-[#ef4444] rounded-xl text-xs font-black font-mono tracking-wider transition-all uppercase shadow-lg shadow-red-950/20 cursor-pointer"
                    >
                      Confirm Snapshot
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* ATTENDANCE SECTION */}
        {activeSubTab === 'attendance' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Your Attendance History Log</h2>
                <p className="text-[10px] text-zinc-500 font-mono">Consolidated biometric surveillance data matching YYYY-MM-DD</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">May 2026 Registry</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-400">
                  <thead className="bg-zinc-900/40 text-[10px] text-zinc-500 font-mono uppercase border-b border-zinc-900">
                    <tr>
                      <th className="p-4 font-bold">DATE</th>
                      <th className="p-4 font-bold">STATUS</th>
                      <th className="p-4 font-bold">CHECK-IN</th>
                      <th className="p-4 font-bold">CHECK-OUT</th>
                      <th className="p-4 font-bold">PRODUCTIVE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-sans">
                    {attendance.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-900/20 transition">
                        <td className="p-4 font-mono font-semibold text-white">{row.date}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            row.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            row.status === 'On Leave' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            row.status === 'Holiday' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-zinc-300">{row.check_in || '--:--'}</td>
                        <td className="p-4 font-mono text-zinc-300">{row.check_out || '--:--'}</td>
                        <td className="p-4 font-mono font-bold text-white">{row.productive_hours} Hrs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LEAVE APPLICATIONS SECTION */}
        {activeSubTab === 'leave' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Split layout: Apply vs Balances & History */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Balances & Form (md: 5) */}
              <div className="md:col-span-5 space-y-4">
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold font-mono text-[#ef4444] uppercase tracking-wider">Leave Balances</h3>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    {balances.map(b => (
                      <div key={b.leave_type_id} className="bg-zinc-900/40 border border-zinc-850 p-2.5 rounded-lg">
                        <span className="text-[9px] text-zinc-500 font-mono uppercase block truncate">{b.leave_type_name}</span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-base font-bold text-white font-mono">{b.remaining}</span>
                          <span className="text-[9px] text-zinc-500">/ {b.allocated} left</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold font-mono text-[#ef4444] uppercase tracking-wider">Apply Leave</h3>
                  
                  <form onSubmit={handleApplyLeave} className="space-y-3">
                    <div className="space-y-1 text-xs">
                      <label className="text-[9px] uppercase font-mono text-zinc-400">Category</label>
                      <select
                        value={leaveTypeId}
                        onChange={(e) => setLeaveTypeId(parseInt(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded text-white focus:outline-none"
                      >
                        {leaveTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1 text-xs">
                        <label className="text-[9px] uppercase font-mono text-zinc-400">From Date</label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <label className="text-[9px] uppercase font-mono text-zinc-400">To Date</label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded text-white text-xs font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-2 bg-zinc-900/50 rounded flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-mono">CALCULATED LENGTH:</span>
                      <span className="text-xs font-bold text-red-400 font-mono">{numDays} Days Registered</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="text-[9px] uppercase font-mono text-zinc-400">Statement of Necessity</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="State reason clearly..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 p-2 rounded text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-[#ef4444] hover:bg-red-500 text-white font-bold font-mono text-[10px] tracking-wider rounded transition uppercase"
                    >
                      SUBMIT APPLICATION
                    </button>
                  </form>
                </div>
              </div>

              {/* History List (md: 7) */}
              <div className="md:col-span-7 bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-4">
                <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">Your Applications Ledger</h3>
                
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {leaves.length === 0 ? (
                    <p className="text-xs text-zinc-600 text-center font-mono py-12">No submitted leaves registered on file.</p>
                  ) : (
                    leaves.map(req => (
                      <div key={req.id} className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-lg space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-white uppercase">{req.leave_type_name}</span>
                            <span className="text-[9px] text-zinc-500 block font-mono">Date block: {req.from_date} to {req.to_date} · ({req.no_of_days} Days)</span>
                          </div>
                          
                          <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border ${
                            req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            req.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 italic font-sans truncate">"{req.reason}"</p>

                        {req.status === 'Pending' && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleWithdrawLeave(req.id)}
                              className="text-[9px] text-rose-500 hover:text-rose-400 font-mono uppercase flex items-center gap-1 bg-red-950/20 px-2 py-1 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                              WITHDRAW REQUEST
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* HOLIDAYS SECTION */}
        {activeSubTab === 'holidays' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-base font-bold text-white tracking-tight">Calendar Holidays Ledger (2026)</h2>
              <p className="text-[10px] text-zinc-500 font-mono">Official annual exclusions list</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {holidays.map(h => (
                <div key={h.id} className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex items-start gap-3">
                  <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-850 shrink-0 text-red-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white font-mono uppercase">{h.name}</h4>
                      <span className="text-[8px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-850">
                        {h.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#ef4444] font-mono mt-0.5 block">{h.date}</span>
                    <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">{h.description || 'Corporate exclusion schedule day off.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFILE MANAGER SECTION */}
        {activeSubTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="border-b border-zinc-900 pb-3">
              <h2 className="text-base font-bold text-white tracking-tight">Profile Credentials & Attributes</h2>
              <p className="text-[10px] text-zinc-500 font-mono">Verify your biometric registry fields</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Avatar face file upload box (4) */}
              <div className="md:col-span-4 bg-zinc-950 border border-zinc-900 p-5 rounded-xl flex flex-col items-center justify-between text-center space-y-4">
                <span className="text-[9px] font-mono text-zinc-500 tracking-wider block uppercase">Biometric Face Print</span>
                
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#ef4444]/40 relative group shadow-lg">
                  <img
                    src={apiService.getFileUrl(profile.avatar)}
                    alt={profile.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-[10px] text-white cursor-pointer font-bold uppercase font-sans">
                    <Camera className="w-5 h-5 mb-1 text-red-400" />
                    Upload File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-bold text-white">{profile.name}</span>
                  <p className="text-[9px] text-[#ef4444] font-mono uppercase">{profile.department} DEP · {profile.role}</p>
                </div>

                <p className="text-[9px] text-zinc-500 leading-relaxed font-sans">
                  Keep your avatar centered to guarantee 99% accuracy rates for neural camera scans.
                </p>
              </div>

              {/* Form profile data fields (8) */}
              <div className="md:col-span-8 bg-zinc-950 border border-zinc-900 p-5 rounded-xl">
                <h3 className="text-xs font-bold font-mono text-[#ef4444] uppercase tracking-wider mb-4">Edit Profile Fields</h3>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-mono text-zinc-400 tracking-wider">Account ID Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs text-white p-2.5 rounded focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-mono text-zinc-400 tracking-wider">Mobile Line</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs text-white p-2.5 rounded focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-mono text-zinc-400 tracking-wider">Gender Identifier</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-850 text-xs text-white p-2 rounded focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-wider block">Secure Email (Read-Only)</span>
                      <span className="w-full bg-zinc-900/40 border border-zinc-900 text-xs text-zinc-500 p-2.5 rounded block select-all font-mono">
                        {profile.email}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-red-650 hover:bg-red-500 text-white font-bold font-mono text-[10px] tracking-wider rounded transition-all shadow bg-[#ef4444]"
                  >
                    SAVE PROFILE PROFILE
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* High Fidelity Dock Nav Bar specifically optimized for Staff User */}
      <nav 
        className={`bg-zinc-950 border-t border-zinc-900 p-2 fixed bottom-0 left-0 right-0 z-40 shadow-2xl transition-transform duration-300 ease-in-out ${
          isBottomNavVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        id="staff-bottom-dock"
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-1 px-4">
          
          <button
            onClick={() => setActiveSubTab('home')}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'home' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Clock className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">My Portal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'attendance' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ClipboardList className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">Attendance</span>
          </button>

          <button
            onClick={() => setActiveSubTab('leave')}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition relative ${
              activeSubTab === 'leave' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">My Leaves</span>
          </button>

          <button
            onClick={() => setActiveSubTab('holidays')}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'holidays' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <CalendarDays className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">Holidays</span>
          </button>

          <button
            onClick={() => setActiveSubTab('profile')}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'profile' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">Profile</span>
          </button>

        </div>
      </nav>

      <DeviceSimulator />
    </div>
  );
}
