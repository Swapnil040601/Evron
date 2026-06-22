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
  Camera as CameraIcon,
  CheckCircle,
  AlertTriangle,
  FileText,
  Smartphone,
  Info,
  Sun,
  Moon,
  MapPin,
  LocateFixed,
  RefreshCw,
  Receipt
} from 'lucide-react';
import ExpenseTracker from './ExpenseTracker';
import AuraBackground from './AuraBackground';
import { useRealDeviceStatus } from '../hooks/useRealDeviceStatus';
import { getDeviceInfo, openUsageAccessSettings } from '../plugins/DeviceInfo';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { App as CapApp } from '@capacitor/app';
import LiveMap from './LiveMap';

interface UserPortalProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

export default function UserPortal({ currentUser, onLogout }: UserPortalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'home' | 'attendance' | 'leave' | 'holidays' | 'expenses' | 'profile'>('home');

  // Hardware back button — go to home sub-tab instead of minimising
  useEffect(() => {
    let listener: any;
    const setup = async () => {
      listener = await CapApp.addListener('backButton', () => {
        if (activeSubTab !== 'home') {
          setActiveSubTab('home');
          window.scrollTo({ top: 0 });
        } else {
          CapApp.minimizeApp();
        }
      });
    };
    setup();
    return () => { listener?.remove?.(); };
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
  const [notification, setNotification] = useState<{ type: 'success' | 'err'; msg: string } | null>(null);

  // Punch-in / Punch-out state
  const [todayPunch, setTodayPunch] = useState<any>(null);
  const [isPunching, setIsPunching] = useState(false);
  const [elapsedDisplay, setElapsedDisplay] = useState('');
  const [punchRemarks, setPunchRemarks] = useState('');

  // Real device GPS + internet status (replaces mock for enforcement)
  const realDevice = useRealDeviceStatus(profile.name);
  const [locationRefreshing, setLocationRefreshing] = useState(false);

  // Walk distance accumulator — persists across sessions within the same day
  const prevGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const walkDistRef = useRef<number>(0);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem(`evron_walk_m_${today}`);
    walkDistRef.current = stored ? parseFloat(stored) : 0;
  }, []);

  // Accumulate walk distance whenever GPS updates
  useEffect(() => {
    if (!realDevice.locationReady || realDevice.latitude === 0) return;
    const lat = realDevice.latitude;
    const lng = realDevice.longitude;

    if (prevGpsRef.current) {
      const prev = prevGpsRef.current;
      const R = 6371000;
      const dLat = (lat - prev.lat) * Math.PI / 180;
      const dLng = (lng - prev.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(prev.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist > 3 && dist < 500) {
        walkDistRef.current += dist;
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`evron_walk_m_${today}`, String(walkDistRef.current));
      }
    }
    prevGpsRef.current = { lat, lng };
  }, [realDevice.latitude, realDevice.longitude, realDevice.locationReady]);

  // Report location to backend every 30s while app is open
  useEffect(() => {
    const report = async () => {
      if (!realDevice.locationReady || realDevice.latitude === 0) return;
      try {
        const deviceInfo = await getDeviceInfo();
        await apiService.postMyLocation({
          latitude: realDevice.latitude,
          longitude: realDevice.longitude,
          accuracy: realDevice.accuracy || undefined,
          wifi_ssid: deviceInfo.wifiSsid,
          network_type: deviceInfo.wifiSsid ? 'wifi' : 'cellular',
          is_developer_mode: deviceInfo.isDeveloperMode,
          walk_distance_m: Math.round(walkDistRef.current),
          other_app_opens: deviceInfo.otherAppOpens,
          app_opens_detail: deviceInfo.appOpensDetail,
          device_id: deviceInfo.deviceId,
          battery_level: deviceInfo.batteryLevel,
          charging_status: deviceInfo.chargingStatus,
          battery_health: deviceInfo.batteryHealth,
          battery_temp: deviceInfo.batteryTemp,
        });
      } catch {}
    };

    report();
    const interval = setInterval(report, 30_000);
    return () => clearInterval(interval);
  }, [realDevice.locationReady, realDevice.latitude, realDevice.longitude]);

  const handleRefreshLocation = async () => {
    setLocationRefreshing(true);
    await realDevice.refreshLocation();
    setLocationRefreshing(false);
  };

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

  // Real photo base64 previews
  const [selfiePunchInImg, setSelfiePunchInImg] = useState<string | null>(localStorage.getItem('selfie_punch_in_img') || null);
  const [selfieDestinationImg, setSelfieDestinationImg] = useState<string | null>(localStorage.getItem('selfie_destination_img') || null);
  const [selfiePunchOutImg, setSelfiePunchOutImg] = useState<string | null>(localStorage.getItem('selfie_punch_out_img') || null);

  const [activeSelfieType, setActiveSelfieType] = useState<'punch_in' | 'destination' | 'punch_out' | null>(null);
  const [isSelfieCapturing, setIsSelfieCapturing] = useState(false);


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
    const today = new Date().toISOString().slice(0, 10);
    const firstOfMonth = today.slice(0, 7) + '-01';

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

      // 6. Today's punch record
      const punchRecord = await apiService.getMyTodayAttendance();
      setTodayPunch(punchRecord);

      // 7. Attendance history — current month from my/history
      const histRows = await apiService.getMyAttendanceHistory(firstOfMonth, today);
      setAttendance(histRows);
      const matchingToday = histRows.find(row => row.date === today);
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


  const handleTriggerSelfie = async (type: 'punch_in' | 'destination' | 'punch_out') => {
    if (!realDevice.gpsEnabled) {
      triggerBanner('err', 'Location required: Turn on GPS / Location services before capturing a selfie.');
      return;
    }
    if (!realDevice.isOnline) {
      triggerBanner('err', 'No internet connection. Connect before capturing a selfie.');
      return;
    }

    setActiveSelfieType(type);
    setIsSelfieCapturing(true);

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      const imgData = `data:image/jpeg;base64,${photo.base64String}`;
      const meta = `Photo @ ${realDevice.latitude.toFixed(4)}, ${realDevice.longitude.toFixed(4)} · ${new Date().toLocaleTimeString()}`;

      if (type === 'punch_in') {
        setSelfiePunchIn(meta);
        setSelfiePunchInImg(imgData);
        localStorage.setItem('selfie_punch_in', meta);
        localStorage.setItem('selfie_punch_in_img', imgData);
        triggerBanner('success', '✅ Punch-in photo captured with GPS coordinates!');
      } else if (type === 'destination') {
        setSelfieDestination(meta);
        setSelfieDestinationImg(imgData);
        localStorage.setItem('selfie_destination', meta);
        localStorage.setItem('selfie_destination_img', imgData);
        triggerBanner('success', '✅ Destination selfie captured!');
      } else if (type === 'punch_out') {
        setSelfiePunchOut(meta);
        setSelfiePunchOutImg(imgData);
        localStorage.setItem('selfie_punch_out', meta);
        localStorage.setItem('selfie_punch_out_img', imgData);
        triggerBanner('success', '✅ Punch-out photo captured!');
      }
    } catch (err: any) {
      if (err?.message !== 'User cancelled photos app') {
        triggerBanner('err', 'Camera error: ' + (err?.message || 'Could not open camera.'));
      }
    } finally {
      setIsSelfieCapturing(false);
      setActiveSelfieType(null);
    }
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

  // Elapsed time since punch-in — updates every 30s
  useEffect(() => {
    const update = () => {
      if (!todayPunch?.mobile_punch_in || todayPunch?.mobile_punch_out) {
        setElapsedDisplay('');
        return;
      }
      const diffMs = Date.now() - new Date(todayPunch.mobile_punch_in).getTime();
      const totalMins = Math.floor(diffMs / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setElapsedDisplay(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [todayPunch]);

  // Punch In
  const handlePunchIn = async () => {
    if (!realDevice.gpsEnabled) {
      triggerBanner('err', realDevice.permissionDenied
        ? 'Location permission denied. Grant location access to punch in.'
        : 'GPS is OFF. Turn on Location services to punch in.');
      return;
    }
    if (!realDevice.isOnline) {
      triggerBanner('err', 'No internet connection. Connect to punch in.');
      return;
    }
    setIsPunching(true);
    try {
      const deviceInfo = await getDeviceInfo();
      // Only send selfie if it's under 2MB base64 (~1.5MB image) to avoid timeout
      const selfieToSend = selfiePunchInImg && selfiePunchInImg.length < 2_000_000 ? selfiePunchInImg : null;
      const record = await apiService.punchIn({
        lat: realDevice.locationReady ? realDevice.latitude : null,
        lng: realDevice.locationReady ? realDevice.longitude : null,
        wifi_ssid: deviceInfo.wifiSsid,
        remarks: punchRemarks.trim() || null,
        selfie_base64: selfieToSend,
      });
      setTodayPunch(record);
      setPunchRemarks('');
      triggerBanner('success', `Punched in at ${new Date(record.mobile_punch_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (err: any) {
      triggerBanner('err', err.message || 'Punch in failed.');
    } finally {
      setIsPunching(false);
    }
  };

  // Punch Out
  const handlePunchOut = async () => {
    if (!realDevice.isOnline) {
      triggerBanner('err', 'No internet connection. Connect to punch out.');
      return;
    }
    setIsPunching(true);
    try {
      const selfieOutToSend = selfiePunchOutImg && selfiePunchOutImg.length < 2_000_000 ? selfiePunchOutImg : null;
      const record = await apiService.punchOut({
        lat: realDevice.locationReady ? realDevice.latitude : null,
        lng: realDevice.locationReady ? realDevice.longitude : null,
        selfie_base64: selfieOutToSend,
      });
      setTodayPunch(record);
      triggerBanner('success', `Punched out at ${new Date(record.mobile_punch_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    } catch (err: any) {
      triggerBanner('err', err.message || 'Punch out failed.');
    } finally {
      setIsPunching(false);
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

      {/* Mandatory GPS Blocker — covers entire app when location is disabled */}
      {!realDevice.gpsEnabled && !realDevice.checking && (
        <div className="fixed inset-0 z-[999] bg-zinc-950/98 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 animate-pulse">
            <MapPin className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider mb-3">Location Required</h2>
          <p className="text-sm text-zinc-400 mb-4 max-w-xs leading-relaxed">
            {realDevice.permissionDenied
              ? 'Location permission has been denied. Go to Settings → Apps → Permissions and enable Location for this app.'
              : 'GPS / Location services are OFF. Enable Location to continue using the app during working hours.'}
          </p>
          <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-3 text-xs text-red-300 font-mono mb-6 max-w-sm">
            Your manager has been notified. App access is restricted until location is restored.
          </div>
          <button
            onClick={handleRefreshLocation}
            disabled={locationRefreshing}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black font-mono rounded-xl uppercase tracking-widest transition active:scale-95 disabled:opacity-50"
          >
            {locationRefreshing ? 'Retrying...' : 'Retry GPS'}
          </button>
        </div>
      )}

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
                  Monitoring Active
                </span>
                <h2 className="text-2xl font-black text-black dark:text-white tracking-tight">
                  Welcome back, {profile.name}!
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Shift ID: <strong className="text-black dark:text-zinc-200">V-GOLD-0900 (09:00 - 18:05)</strong></span>
                  <span>•</span>
                  <span>Device: <strong className="text-black dark:text-emerald-400">Registered & Monitored</strong></span>
                  <span>•</span>
                  <span>IP Guard: <strong className="text-black dark:text-emerald-400">192.168.1.182</strong></span>
                </div>
              </div>

              {/* Dynamic Warning Alerts - No generic boxes, elegant badge arrays */}
              <div className="flex flex-wrap gap-2.5">
                {/* Real GPS Status Alert */}
                {!realDevice.gpsEnabled && !realDevice.checking && (
                  <div className="px-3 py-2 bg-red-500/15 border border-red-500/50 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400 animate-pulse">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <div>
                      <strong className="block font-bold mt-0.5 uppercase">
                        {realDevice.permissionDenied ? 'Location Permission Denied' : 'GPS / Location Services OFF'}
                      </strong>
                      <span className="text-[10px] opacity-90">
                        {realDevice.permissionDenied
                          ? 'Go to Settings → App Permissions → Allow Location.'
                          : 'Turn on Location in your device settings. Attendance is blocked.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Internet connectivity alert */}
                {!realDevice.isOnline && (
                  <div className="px-3 py-2 bg-orange-500/15 border border-orange-500/50 rounded-xl flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <div>
                      <strong className="block font-bold mt-0.5 uppercase">No Internet Connection</strong>
                      <span className="text-[10px] opacity-90">Connect to WiFi or mobile data. Admin has been notified.</span>
                    </div>
                  </div>
                )}

                <div className="px-3 py-1 bg-zinc-900/40 border border-zinc-800 rounded-xl flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-400">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                  <span className="text-[10px] tracking-tight font-mono uppercase">Device: Registered &amp; Monitored</span>
                </div>
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
                        {(walkDistRef.current / 1000).toFixed(2)} Kilometers
                      </span>
                      <span className="text-[9px] text-zinc-400">Real-time GPRS mileage odometer</span>
                    </div>
                    <MapPin className="w-10 h-10 text-red-500/15 flex-shrink-0" />
                  </div>

                  <div className="flex items-center justify-between p-1 border-t md:border-t-0 md:border-l border-zinc-800/40 md:pl-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-mono tracking-wider block uppercase">GPS STATUS</span>
                      <span className={`text-2xl font-mono font-black mt-0.5 block ${realDevice.gpsEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                        {realDevice.gpsEnabled ? 'Active' : 'Offline'}
                      </span>
                      <span className="text-[9px] text-zinc-400">Location & app monitoring</span>
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

                {/* Punch In / Punch Out Card */}
                <div className="pt-4 border-t border-zinc-800/40 space-y-4">
                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">Today's Attendance</span>

                  {/* Two time boxes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${todayPunch?.mobile_punch_in ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-zinc-900/30 border-zinc-800'}`}>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Punch In</span>
                      {todayPunch?.mobile_punch_in ? (
                        <>
                          <span className="text-base font-black font-mono text-emerald-400">
                            {new Date(todayPunch.mobile_punch_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {todayPunch.punch_in_lat && (
                            <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                              📍 {Number(todayPunch.punch_in_lat).toFixed(4)}, {Number(todayPunch.punch_in_lng).toFixed(4)}
                            </span>
                          )}
                          {todayPunch.punch_in_selfie && (
                            <img
                              src={apiService.getFileUrl(todayPunch.punch_in_selfie)}
                              alt="Punch-in selfie"
                              className="w-full h-20 object-cover rounded-lg border border-emerald-500/30 mt-1.5"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                          {todayPunch.remarks && (
                            <span className="text-[9px] text-zinc-400 font-mono block mt-0.5 italic">"{todayPunch.remarks}"</span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm font-mono text-zinc-600">—</span>
                      )}
                    </div>

                    <div className={`p-3 rounded-xl border ${todayPunch?.mobile_punch_out ? 'bg-zinc-900/30 border-zinc-700' : 'bg-zinc-900/30 border-zinc-800'}`}>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">Punch Out</span>
                      {todayPunch?.mobile_punch_out ? (
                        <>
                          <span className="text-base font-black font-mono text-zinc-200">
                            {new Date(todayPunch.mobile_punch_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {todayPunch.punch_out_lat && (
                            <span className="text-[9px] text-zinc-500 font-mono block mt-0.5">
                              📍 {Number(todayPunch.punch_out_lat).toFixed(4)}, {Number(todayPunch.punch_out_lng).toFixed(4)}
                            </span>
                          )}
                          {todayPunch.punch_out_selfie && (
                            <img
                              src={apiService.getFileUrl(todayPunch.punch_out_selfie)}
                              alt="Punch-out selfie"
                              className="w-full h-20 object-cover rounded-lg border border-zinc-600/30 mt-1.5"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                        </>
                      ) : (
                        <span className="text-sm font-mono text-zinc-600">—</span>
                      )}
                    </div>
                  </div>

                  {/* Status line + elapsed */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        todayPunch?.mobile_punch_out ? 'bg-zinc-500' :
                        todayPunch?.mobile_punch_in  ? 'bg-emerald-500 animate-pulse' :
                        'bg-red-500'
                      }`} />
                      <span className="text-xs font-bold font-mono text-black dark:text-white uppercase">
                        {todayPunch?.mobile_punch_out
                          ? 'SHIFT ENDED'
                          : todayPunch?.mobile_punch_in
                            ? `ON DUTY${elapsedDisplay ? ' · ' + elapsedDisplay : ''}`
                            : 'NOT PUNCHED IN'}
                      </span>
                    </div>
                  </div>

                  {/* Remarks input — only show when not yet punched in */}
                  {!todayPunch?.mobile_punch_in && !todayPunch?.mobile_punch_out && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block">Remarks (optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Add a note for this punch-in..."
                        value={punchRemarks}
                        onChange={e => setPunchRemarks(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 resize-none font-mono"
                      />
                    </div>
                  )}

                  {/* Action Button */}
                  {!todayPunch?.mobile_punch_out && (
                    <button
                      onClick={todayPunch?.mobile_punch_in ? handlePunchOut : handlePunchIn}
                      disabled={isPunching || !realDevice.isOnline || (!todayPunch?.mobile_punch_in && !realDevice.gpsEnabled)}
                      className={`w-full py-3 rounded-xl text-xs font-black font-mono tracking-wider flex items-center justify-center gap-2 uppercase transition-all shadow-lg ${
                        isPunching
                          ? 'bg-zinc-800 text-zinc-400 animate-pulse cursor-not-allowed'
                          : !realDevice.isOnline
                            ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                            : todayPunch?.mobile_punch_in
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : !realDevice.gpsEnabled
                                ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      {isPunching
                        ? 'Processing...'
                        : !realDevice.isOnline
                          ? 'NO INTERNET'
                          : todayPunch?.mobile_punch_in
                            ? 'PUNCH OUT'
                            : !realDevice.gpsEnabled
                              ? 'GPS REQUIRED'
                              : 'PUNCH IN'}
                    </button>
                  )}
                </div>

              </div>

              {/* Right Column: Multi-Stage Secure Location-Tied Selfies (lg: 5) */}
              <div className="lg:col-span-5 space-y-5 border-t lg:border-t-0 lg:border-l border-zinc-800/60 pt-6 lg:pt-0 lg:pl-6">
                
                <div className="space-y-1">
                  <h3 className="text-xs font-mono font-black uppercase text-[#ef4444] tracking-widest flex items-center gap-1.5">
                    <CameraIcon className="w-4 h-4" />
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
                    <div className="flex items-center gap-3">
                      {selfiePunchInImg ? (
                        <img src={selfiePunchInImg} alt="punch-in" className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40 flex-shrink-0" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-red-650/10 border border-red-500 text-[10px] font-mono font-bold flex items-center justify-center text-[#ef4444] flex-shrink-0">1</span>
                      )}
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-black dark:text-white uppercase leading-none">Punch-In Selfie</h4>
                        <span className="block text-[9.5px] text-zinc-500 font-mono leading-tight">
                          {selfiePunchIn ? "✅ " + selfiePunchIn : "⚠️ PENDING"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTriggerSelfie('punch_in')}
                      disabled={isSelfieCapturing && activeSelfieType === 'punch_in'}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider cursor-pointer flex-shrink-0 ${
                        selfiePunchIn ? 'bg-zinc-900 border border-zinc-805 text-zinc-400 hover:text-white' : 'bg-[#ef4444] hover:bg-red-500 text-white'
                      }`}
                    >
                      {isSelfieCapturing && activeSelfieType === 'punch_in' ? '...' : selfiePunchIn ? 'RE-TAKE' : 'CAPTURE'}
                    </button>
                  </div>

                  {/* Stage 2: DESTINATION ARRIVAL SELFIE */}
                  <div className="flex items-center justify-between gap-4 p-3.5 bg-black/40 border border-zinc-900 rounded-xl">
                    <div className="flex items-center gap-3">
                      {selfieDestinationImg ? (
                        <img src={selfieDestinationImg} alt="destination" className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40 flex-shrink-0" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-red-650/10 border border-red-500 text-[10px] font-mono font-bold flex items-center justify-center text-[#ef4444] flex-shrink-0">2</span>
                      )}
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-black dark:text-white uppercase leading-none">Destination Arrival</h4>
                        <span className="block text-[9.5px] text-zinc-500 font-mono leading-tight">
                          {selfieDestination ? "✅ " + selfieDestination : "⚠️ PENDING DESTINATION"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTriggerSelfie('destination')}
                      disabled={isSelfieCapturing && activeSelfieType === 'destination'}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider cursor-pointer flex-shrink-0 ${
                        selfieDestination ? 'bg-zinc-900 border border-zinc-805 text-zinc-400 hover:text-white' : 'bg-[#ef4444] hover:bg-red-500 text-white'
                      }`}
                    >
                      {isSelfieCapturing && activeSelfieType === 'destination' ? '...' : selfieDestination ? 'RE-TAKE' : 'CAPTURE'}
                    </button>
                  </div>

                  {/* Stage 3: PUNCH OUT SELFIE */}
                  <div className="flex items-center justify-between gap-4 p-3.5 bg-black/40 border border-zinc-900 rounded-xl">
                    <div className="flex items-center gap-3">
                      {selfiePunchOutImg ? (
                        <img src={selfiePunchOutImg} alt="punch-out" className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40 flex-shrink-0" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-red-650/10 border border-red-500 text-[10px] font-mono font-bold flex items-center justify-center text-[#ef4444] flex-shrink-0">3</span>
                      )}
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-black dark:text-white uppercase leading-none">Punch-Out Selfie</h4>
                        <span className="block text-[9.5px] text-zinc-500 font-mono leading-tight">
                          {selfiePunchOut ? "✅ " + selfiePunchOut : "⚠️ PENDING PUNCH OUT"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTriggerSelfie('punch_out')}
                      disabled={isSelfieCapturing && activeSelfieType === 'punch_out'}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider cursor-pointer flex-shrink-0 ${
                        selfiePunchOut ? 'bg-zinc-900 border border-zinc-805 text-zinc-400 hover:text-white' : 'bg-[#ef4444] hover:bg-red-500 text-white'
                      }`}
                    >
                      {isSelfieCapturing && activeSelfieType === 'punch_out' ? '...' : selfiePunchOut ? 'RE-TAKE' : 'CAPTURE'}
                    </button>
                  </div>

                </div>

                <div className="bg-emerald-950/15 border border-emerald-900/30 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-400">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-ping flex-shrink-0" />
                  <span className="text-[10px] font-sans">
                    <strong>Location Tracking: ON.</strong> Your location is being shared with your manager in real time.
                  </span>
                </div>

              </div>

            </div>

            {/* Live GPS Map — employee's real location */}
            {realDevice.gpsEnabled && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-black uppercase text-[#ef4444] tracking-widest flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    Your Live Location
                  </h3>
                  <div className="flex items-center gap-2">
                    {realDevice.locationReady && (
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">
                        {realDevice.latitude.toFixed(5)}, {realDevice.longitude.toFixed(5)}
                      </span>
                    )}
                    <button
                      onClick={handleRefreshLocation}
                      disabled={locationRefreshing}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-mono text-emerald-400 hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {locationRefreshing
                        ? <RefreshCw className="w-3 h-3 animate-spin" />
                        : <LocateFixed className="w-3 h-3" />
                      }
                      {locationRefreshing ? 'Locating...' : 'Refresh'}
                    </button>
                  </div>
                </div>
                {realDevice.locationReady ? (
                  <LiveMap
                    centerLat={realDevice.latitude}
                    centerLng={realDevice.longitude}
                    zoom={16}
                    geofenceRadius={300}
                    selfMode
                    employees={[{
                      id: profile.code || 'emp',
                      name: profile.name,
                      lat: realDevice.latitude,
                      lng: realDevice.longitude,
                      status: todayAttendance?.status || 'Unknown',
                      insideGeofence: true,
                    }]}
                    height="280px"
                  />
                ) : (
                  <div className="flex items-center justify-center h-[280px] bg-zinc-950 border border-zinc-800 rounded-xl">
                    <div className="text-center space-y-2">
                      <LocateFixed className="w-6 h-6 text-zinc-600 mx-auto animate-pulse" />
                      <p className="text-[10px] font-mono text-zinc-500">Acquiring GPS signal...</p>
                    </div>
                  </div>
                )}
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
                <p className="text-[10px] text-zinc-500 font-mono">Your attendance records by date</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} Registry</span>
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
                      <th className="p-4 font-bold">SELFIES</th>
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
                        <td className="p-3">
                          <div className="flex gap-1.5">
                            {row.punch_in_selfie && (
                              <img
                                src={apiService.getFileUrl(row.punch_in_selfie)}
                                alt="in"
                                title="Punch-in selfie"
                                className="w-9 h-9 rounded object-cover border border-emerald-500/40 cursor-pointer hover:scale-125 transition-transform"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            {row.punch_out_selfie && (
                              <img
                                src={apiService.getFileUrl(row.punch_out_selfie)}
                                alt="out"
                                title="Punch-out selfie"
                                className="w-9 h-9 rounded object-cover border border-zinc-600/40 cursor-pointer hover:scale-125 transition-transform"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                            {!row.punch_in_selfie && !row.punch_out_selfie && (
                              <span className="text-zinc-700 text-[9px] font-mono">—</span>
                            )}
                          </div>
                        </td>
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
                <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-wider">Your Leave Applications</h3>
                
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
              <h2 className="text-base font-bold text-white tracking-tight">Public Holidays (2026)</h2>
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

        {/* EXPENSES SECTION */}
        {activeSubTab === 'expenses' && (
          <div className="animate-fadeIn">
            <ExpenseTracker currentUser={profile} />
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
                    <CameraIcon className="w-5 h-5 mb-1 text-red-400" />
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
                    SAVE PROFILE
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
            onClick={() => { setActiveSubTab('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'home' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Clock className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">My Portal</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('attendance'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'attendance' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ClipboardList className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">Attendance</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('leave'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition relative ${
              activeSubTab === 'leave' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">My Leaves</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('holidays'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'holidays' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <CalendarDays className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">Holidays</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('expenses'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'expenses' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Receipt className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">Expenses</span>
          </button>

          <button
            onClick={() => { setActiveSubTab('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center justify-center py-1 flex-1 text-center transition ${
              activeSubTab === 'profile' ? 'text-red-500 font-bold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] font-semibold font-mono">Profile</span>
          </button>

        </div>
      </nav>

    </div>
  );
}
