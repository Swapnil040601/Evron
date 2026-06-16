/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// v2
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  LayoutGrid,
  AlertTriangle,
  Info,
  Calendar,
  Users2,
  FileSliders,
  LogOut,
  ArrowRight,
  Receipt,
  Zap,
  HelpCircle,
  Settings as SettingsIcon,
  Sun,
  Moon
} from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import { showAlert } from './utils/dialog';

// Import Types
import { Employee, LeaveApplication, Holiday, UserProfile, AttendanceRecord } from './types';
import { apiService } from './services/api';
import { triggerHaptic, HAPTIC_PATTERNS } from './services/haptics';

// Import Screen Components
import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance';
import LeaveApprovals from './components/LeaveApprovals';
import ExpenseTracker from './components/ExpenseTracker';
import MoreMenu from './components/MoreMenu';
import DaySummary from './components/DaySummary';
import Users from './components/Users';
import Login from './components/Login';
import UserPortal from './components/UserPortal';
import { ShieldAlert } from 'lucide-react';
import AuraBackground from './components/AuraBackground';
import ProductivityComplianceHub from './components/ProductivityComplianceHub';

export default function App() {
  // Navigation Router State for Admin/Super Admin
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Attendance' | 'Leave' | 'Expenses' | 'More' | 'Day Summary' | 'Users' | 'Productivity'>('Dashboard');
  // Reset keys: increment to force a sub-section back to its main page
  const [moreMenuKey, setMoreMenuKey] = useState(0);
  const [productivityKey, setProductivityKey] = useState(0);
  
  // Active Alerts Popover Dropdown Toggle
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  // Selected filter on Daily attendance log, set dynamically when clicking dashboard stats cards
  const [attendanceFilter, setAttendanceFilter] = useState<'All' | 'Present' | 'Late' | 'Absent' | 'On Leave'>('All');

  // Close unread alerts dropdown when clicking anywhere outside of it
  useEffect(() => {
    if (!showAlertsDropdown) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#header-alerts-container')) {
        setShowAlertsDropdown(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [showAlertsDropdown]);
  
  // Theme updates trigger state
  const [themeForceUpdate, setThemeForceUpdate] = useState(0);

  // Initialize theme on mount
  useEffect(() => {
    const activeTheme = localStorage.getItem('app-theme') || 'dark';
    if (activeTheme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.remove('theme-light');
    }
  }, [themeForceUpdate]);

  // Listen to external theme changes to keep components in sync
  useEffect(() => {
    const handleThemeChange = () => {
      setThemeForceUpdate(p => p + 1);
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => {
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  // Active User session state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Pre-selected tool to load inside More Menu
  const [preSelectedMoreTool, setPreSelectedMoreTool] = useState<string | null>(null);

  // Core administrative dashboard state parameters fetched from backend/simulator
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveApplication[]>([]);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState({ present: 0, absent: 0, total: 0 });
  
  // cameras state removed — LiveView removed

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [simAlerts, setSimAlerts] = useState<any[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  // Scrolling-to-reveal navigation bar logic
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);

  useEffect(() => {
    // Keep bottom nav persistently visible at all times for reliable iframe usability
    setIsBottomNavVisible(true);
  }, [activeTab]);

  // Hardware back button (Android) — navigate back instead of minimising
  useEffect(() => {
    let listener: any;
    const setup = async () => {
      listener = await CapApp.addListener('backButton', () => {
        const tabOrder: typeof activeTab[] = ['Dashboard', 'Expenses', 'Productivity', 'More'];
        if (activeTab !== 'Dashboard') {
          // Sub-tabs like Leave/Attendance/Users go back to More
          if (['Leave', 'Attendance', 'Day Summary', 'Users'].includes(activeTab)) {
            setActiveTab('More');
          } else {
            setActiveTab('Dashboard');
          }
          window.scrollTo({ top: 0 });
        } else {
          CapApp.minimizeApp();
        }
      });
    };
    setup();
    return () => { listener?.remove?.(); };
  }, [activeTab]);

  // Trigger login session retrieval
  useEffect(() => {
    checkActiveSession();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'user') {
      loadAdminData();
    }
  }, [currentUser]);

  const checkActiveSession = async () => {
    setIsAuthLoading(true);

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), ms)
        ),
      ]);

    try {
      let token = apiService.getToken();
      if (!token) {
        try {
          const res = await withTimeout(
            apiService.login('admin@evronnetworks.com', 'Admin@123'),
            8000
          );
          token = res.token;
        } catch (e) {
          console.warn('Startup login fallback unsuccessful:', e);
        }
      }

      if (token) {
        const profile = await withTimeout(apiService.getProfile(), 8000);
        setCurrentUser(profile);
      }
    } catch (err) {
      console.warn('Recovered auth error: state cleared.');
      apiService.logout();
      setCurrentUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };


  const loadAdminData = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);

      // 1. Fetch Users + today's real attendance in parallel
      const [uRes, attRes] = await Promise.all([
        apiService.getUsersList({
          page: 1,
          limit: 100,
          search: '',
          department: '',
          status: 'Active',
          type: 'Staff'
        }),
        apiService.getAttendanceList({
          from: today,
          to: today,
          user_id: null,
          status: null,
          search: '',
          page: 1,
          limit: 500
        })
      ]);

      // Build userId → attendance record map for O(1) lookup
      const attendanceMap = new Map<number, AttendanceRecord>();
      attRes.rows.forEach(r => attendanceMap.set(r.user_id, r));

      const seenEmpIds = new Set<string>();
      const mappedEmp: Employee[] = [];
      uRes.rows.forEach(user => {
        const empId = user.code || `EMP-${user.id}`;
        if (!seenEmpIds.has(empId.toLowerCase().trim())) {
          seenEmpIds.add(empId.toLowerCase().trim());
          const att = attendanceMap.get(user.id);
          const status = att?.status || 'Absent';
          const checkInTime = att?.check_in
            ? new Date(`1970-01-01T${att.check_in}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : undefined;
          mappedEmp.push({
            id: empId,
            name: user.name,
            avatar: user.avatar ? apiService.getFileUrl(user.avatar) : '',
            role: (user.role || 'staff').replace('_', ' ').toUpperCase(),
            department: user.department,
            email: user.email,
            status: status as Employee['status'],
            checkInTime,
            attendanceRate: att ? 100 : 0,
            phone: user.phone,
          });
        }
      });
      setEmployees(mappedEmp);

      // 2. Fetch Leaves Approvals Queue
      const lRes = await apiService.getReporteesLeaves();
      setLeaveRequests(lRes);

      // 3. Fetch alerts log unreads
      const count = await apiService.getUnreadAlertsCount();
      setUnreadAlerts(count);

      const alertList = await apiService.getAlerts();
      setSimAlerts(alertList);

      // 4. Fetch dashboard stats + holidays in parallel
      const [dStats, holidayList] = await Promise.all([
        apiService.getDashboardData(today),
        apiService.getHolidays(new Date().getFullYear())
      ]);
      setTodayAttendanceCount({
        present: dStats.summary.present,
        absent: dStats.summary.absent,
        total: dStats.summary.totalEmployees
      });
      setHolidays(holidayList);

    } catch (err) {
      console.warn('Sync logs error in watchtower loader.');
    }
  };

  const handleLogout = () => {
    apiService.logout();
    setCurrentUser(null);
    setActiveTab('Dashboard');
    handleClearPreSelectedTool();
  };

  // Dynamic Navigation callbacks
  const handleNavigateToMoreTool = (toolName: string) => {
    setPreSelectedMoreTool(toolName);
    setActiveTab('More');
  };

  const handleClearPreSelectedTool = () => {
    setPreSelectedMoreTool(null);
  };

  // State Modifiers mapping API requests

  // 1. Add Employee Flow
  const handleAddEmployee = async (newEmp: Employee, facePhoto: File | null, password: string, userRole: string) => {
    try {
      const created = await apiService.createUser({
        name: newEmp.name,
        code: newEmp.id,
        email: newEmp.email,
        phone: newEmp.phone,
        gender: 'Male',
        type: 'Staff',
        department: newEmp.department,
        role: userRole || 'user',
        status: 'Active',
        password,
        reporting_manager_id: null,
        reporting_manager_name: null
      });

      if (facePhoto && created?.id) {
        try {
          await apiService.uploadUserAvatar(created.id, facePhoto);
        } catch {
          // avatar upload failed — not critical
        }
      }

      await loadAdminData();

    } catch (err) {
      showAlert('Failed saving newly added employee record to backend.', 'error');
    }
  };

  // Approve/Reject leave requested actions
  const handleApproveLeave = async (id: string) => {
    try {
      const numId = parseInt(id) || Math.floor(Math.random() * 900) + 100;
      await apiService.updateLeaveStatus(numId, 'Approved');
      await loadAdminData();
    } catch {
      showAlert('Error recording leave approval decision.', 'error');
    }
  };

  const handleRejectLeave = async (id: string) => {
    try {
      const numId = parseInt(id) || Math.floor(Math.random() * 900) + 100;
      await apiService.updateLeaveStatus(numId, 'Rejected');
      await loadAdminData();
    } catch {
      showAlert('Error recording leave rejection choice.', 'error');
    }
  };


  // Render Gatekeepers
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 select-none">
        <div className="w-14 h-14 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-xl shadow-lg rotate-3 border border-red-500/20">
          EN
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
        <span className="font-mono text-sm text-zinc-400 uppercase tracking-widest">Loading...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col relative overflow-hidden select-none selection:bg-red-650 selection:text-white" id="auth-login-viewcontainer">
        <AuraBackground />
        <Login 
          onLoginSuccess={(u) => setCurrentUser(u)} 
        />
      </div>
    );
  }

  // Routing matrix based on profile role check
  if (currentUser.role === 'user') {
    return <UserPortal currentUser={currentUser} onLogout={handleLogout} />;
  }

  // RENDER DOCK LAYOUT FOR SUPER ADMIN & ADMIN ROLES
  const pendingLeavesCount = leaveRequests.filter(req => req.status === 'Pending').length;

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-transparent text-zinc-100 flex flex-col relative selection:bg-red-650 selection:text-white" id="main-application-stage">
      <AuraBackground />
      
      {/* Dynamic Upper Surveillance Strip */}
      <header className="bg-zinc-950 border-b border-zinc-900 sticky top-0 z-40 px-4 py-3 md:px-6 animate-fadeIn" id="app-global-header">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-md tracking-tighter shadow-lg rotate-3 border border-red-500/20" id="app-logo-cube">
              EN
            </div>
          </div>

          {/* Quick exit bar and Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 text-xs">
            
            {/* Direct Navigation Button to Productivity & Compliance Hub */}
            <button
              onClick={() => {
                setActiveTab('Productivity');
                handleClearPreSelectedTool();
              }}
              className={`p-2 px-3 bg-red-950/20 border hover:bg-red-950/45 rounded-xl transition flex items-center justify-center shrink-0 cursor-pointer font-extrabold font-mono text-[9.5px] uppercase tracking-wider gap-2 shadow-sm shadow-red-950 h-10 ${
                activeTab === 'Productivity'
                  ? 'border-red-500 text-white bg-red-900/30'
                  : 'border-red-900/40 text-red-400 hover:border-red-500'
              }`}
              id="header-productivity-hub-btn"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden md:inline">🛰️ COMPLIANCE HUB</span>
            </button>

            {/* Quick Theme Switcher */}
            <button
              onClick={() => {
                const isLight = document.documentElement.classList.contains('theme-light');
                if (isLight) {
                  document.documentElement.classList.remove('theme-light');
                  localStorage.setItem('app-theme', 'dark');
                } else {
                  document.documentElement.classList.add('theme-light');
                  localStorage.setItem('app-theme', 'light');
                }
                setThemeForceUpdate(p => p + 1);
              }}
              className="p-2 w-10 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-xl text-zinc-400 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer"
              title={document.documentElement.classList.contains('theme-light') ? "Switch to Dark Mode" : "Switch to Light Mode"}
              id="header-theme-toggle-btn"
            >
              {document.documentElement.classList.contains('theme-light') ? (
                <Sun className="w-4.5 h-4.5 text-amber-500" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-purple-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('Leave')}
              className="relative p-2 w-10 h-10 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 rounded-xl text-zinc-400 hover:text-white transition flex items-center justify-center shrink-0"
              title="View Leave Approvals Queue"
            >
              <Calendar className="w-4.5 h-4.5" />
              {pendingLeavesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce shadow">
                  {pendingLeavesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('Users')}
              className="p-2 bg-zinc-900 hover:bg-zinc-805 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition font-mono text-[11px] hidden md:flex items-center gap-1.5 h-10"
            >
              <Users2 className="w-4 h-4 text-emerald-400" />
              <span>STAFF LIST</span>
            </button>

            {/* Real-time Alerts Dropdown popover on right corner */}
            <div className="relative" id="header-alerts-container">
              <button
                onClick={() => {
                  setShowAlertsDropdown(!showAlertsDropdown);
                  if (unreadAlerts > 0) {
                    apiService.markAllAlertsRead().then(() => {
                      setUnreadAlerts(0);
                    }).catch(() => {});
                  }
                }}
                className="relative p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-red-900 rounded-xl text-zinc-400 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer h-10 w-10 shadow-sm"
                title="View Security Violations Alerts Log"
                id="header-alerts-trigger-icon"
              >
                <AlertTriangle className={`w-4.5 h-4.5 ${unreadAlerts > 0 ? 'text-red-500 animate-bounce' : 'text-zinc-400'}`} />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-600 text-white font-mono text-[9px] font-black rounded-full flex items-center justify-center animate-pulse border border-zinc-950 shadow-md">
                    {unreadAlerts}
                  </span>
                )}
              </button>

              {showAlertsDropdown && (
                <div 
                  className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-zinc-950/95 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-55 animate-fadeIn md:origin-top-right" 
                  id="alerts-dropdown-panel"
                  style={{
                    right: 0,
                    maxWidth: 'calc(100vw - 32px)'
                  }}
                >
                  <div className="bg-zinc-900/95 border-b border-zinc-850 px-4 py-3 flex items-center justify-between font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider leading-none">
                    <span className="flex items-center gap-1.5 text-red-500 font-extrabold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      COMPLIANCE INCIDENTS
                    </span>
                    <button 
                      onClick={() => {
                        triggerHaptic(HAPTIC_PATTERNS.success);
                        setSimAlerts([]);
                        setUnreadAlerts(0);
                      }}
                      className="text-[8px] text-zinc-500 hover:text-red-400 transition"
                    >
                      CLEAR ALL
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-900/80 text-left p-2 space-y-1 bg-black/40">
                    {simAlerts.length === 0 ? (
                      <div className="py-8 text-center text-zinc-650 font-mono text-[10px]">
                        ● ALL SECTORS COMPLIANT
                      </div>
                    ) : (
                      simAlerts.slice(0, 8).map((alertItem: any, index: number) => (
                        <div key={alertItem.id || index} className="p-2.5 hover:bg-zinc-900/40 rounded transition space-y-1">
                          <div className="flex items-center justify-between font-mono text-[7px] tracking-wider uppercase">
                            <span className="text-red-500 font-black">● SECURITY WARNING</span>
                            <span className="text-zinc-500">{alertItem.timestamp ? alertItem.timestamp.split(' ').slice(1).join(' ') : "JUST NOW"}</span>
                          </div>
                          <p className="text-[10px] text-zinc-350 leading-relaxed font-sans">
                            {alertItem.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="bg-zinc-950 p-2.5 border-t border-zinc-900 text-center">
                    <button
                      onClick={() => {
                        setShowAlertsDropdown(false);
                        setActiveTab('Productivity');
                      }}
                      className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 hover:border-red-900 rounded text-[9.5px] uppercase font-mono tracking-widest text-zinc-400 hover:text-white transition"
                    >
                      OPEN PRODUCTIVITY MONITOR
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Primary Middle Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 md:px-6 pb-24 overflow-y-auto" id="main-content-viewport">
        
        
        {/* Router Render blocks */}
        <AnimatePresence mode="wait">
          {activeTab === 'Dashboard' && (
            <motion.div
              key="Dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Dashboard
                employees={employees}
                activityLogs={simAlerts.map((a: any) => ({
                  id: `ACT-${a.id}`,
                  type: a.type === 'critical' ? 'alert' : 'system',
                  detail: a.message,
                  time: a.created_at ? new Date(a.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (a.timestamp || ''),
                  cameraName: 'System Trigger'
                }))}
                onNavigate={(screen, filter) => {
                  if (screen === 'Attendance' && filter) {
                    setAttendanceFilter(filter as any);
                  }
                  setActiveTab(screen as any);
                }}
                onNavigateMoreTool={handleNavigateToMoreTool}
                pendingLeavesCount={pendingLeavesCount}
              />
            </motion.div>
          )}

          {activeTab === 'Attendance' && (
            <motion.div
              key="Attendance"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Attendance
                employees={employees}
                onNavigate={(screen) => setActiveTab(screen as any)}
                initialFilter={attendanceFilter}
              />
            </motion.div>
          )}

          {activeTab === 'Leave' && (
            <motion.div
              key="Leave"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <LeaveApprovals
                leaveRequests={leaveRequests.map((req: any) => ({
                  id: String(req.id),
                  employeeName: req.user_name || 'Sarah Jenkins',
                  department: req.department || 'Engineering',
                  role: 'Staff User',
                  leaveType: req.leave_type_name.split(' ')[0] as any,
                  startDate: req.from_date,
                  endDate: req.to_date,
                  reason: req.reason,
                  status: req.status
                }))}
                onApprove={handleApproveLeave}
                onReject={handleRejectLeave}
              />
            </motion.div>
          )}

          {activeTab === 'Expenses' && currentUser && (
            <motion.div
              key="Expenses"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <ExpenseTracker currentUser={currentUser} />
            </motion.div>
          )}

          {activeTab === 'More' && (
            <motion.div
              key="More"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <MoreMenu
                key={moreMenuKey}
                employees={employees}
                holidays={holidays}
                securityEvents={[]}
                onAddSecurityEvent={() => {}}
                currentUser={currentUser}
                activePreSelectedSubTool={preSelectedMoreTool}
                onClearPreSelectedTool={handleClearPreSelectedTool}
                onSyncData={loadAdminData}
                onTriggerAlert={async (detail, cameraName, status) => {
                  await apiService.addSimulatorAlert(`[${cameraName}] ${detail}`, status);
                  await loadAdminData();
                }}
                onLogout={handleLogout}
              />
            </motion.div>
          )}

          {activeTab === 'Productivity' && (
            <motion.div
              key="Productivity"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <ProductivityComplianceHub
                key={productivityKey}
                employees={employees}
                onTriggerAlert={async (detail, cameraName, status) => {
                  await apiService.addSimulatorAlert(`[${cameraName}] ${detail}`, status);
                  await loadAdminData();
                }}
              />
            </motion.div>
          )}

          {activeTab === 'Day Summary' && (
            <motion.div
              key="Day Summary"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <DaySummary employees={employees} />
            </motion.div>
          )}

          {activeTab === 'Users' && (
            <motion.div
              key="Users"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="w-full"
            >
              <Users employees={employees} onAddEmployee={handleAddEmployee} />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* High Fidelity Rigid Bottom Navigation Bar */}
      <nav 
        className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 pb-safe pt-2 px-2 fixed bottom-0 left-0 right-0 z-40 shadow-2xl transition-transform duration-350"
        id="bottom-navigation-dock"
      >
        <div className="max-w-lg mx-auto flex items-center justify-between gap-1.5 px-2 relative">
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.light);
              setActiveTab('Dashboard');
              handleClearPreSelectedTool();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 text-center transition relative outline-none select-none ${
              activeTab === 'Dashboard' 
                ? 'text-red-500 font-bold' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutGrid className={`w-4.5 h-4.5 mb-1 transition-transform duration-250 ${activeTab === 'Dashboard' ? 'scale-110 text-red-500' : ''}`} />
            <span className="text-[10px] font-semibold font-mono tracking-tight">Dashboard</span>
            {activeTab === 'Dashboard' && (
              <motion.span 
                layoutId="active-nav-glow" 
                className="absolute -top-2 w-6 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] rounded-full" 
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.light);
              setActiveTab('Expenses');
              handleClearPreSelectedTool();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 text-center transition relative outline-none select-none ${
              activeTab === 'Expenses'
                ? 'text-red-500 font-bold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Receipt className={`w-4.5 h-4.5 mb-1 transition-transform duration-250 ${activeTab === 'Expenses' ? 'scale-110 text-red-500' : ''}`} />
            <span className="text-[10px] font-semibold font-mono tracking-tight">Expenses</span>
            {activeTab === 'Expenses' && (
              <motion.span
                layoutId="active-nav-glow"
                className="absolute -top-2 w-6 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.light);
              setActiveTab('Productivity');
              setProductivityKey(k => k + 1);
              handleClearPreSelectedTool();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 text-center transition relative outline-none select-none ${
              activeTab === 'Productivity' 
                ? 'text-red-500 font-bold' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ShieldAlert className={`w-4.5 h-4.5 mb-1 text-red-500 transition-transform duration-250 ${activeTab === 'Productivity' ? 'scale-110 animate-pulse text-red-400' : 'text-zinc-500'}`} />
            <span className="text-[10px] font-semibold font-mono tracking-tight">Productivity</span>
            {activeTab === 'Productivity' && (
              <motion.span 
                layoutId="active-nav-glow" 
                className="absolute -top-2 w-6 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] rounded-full" 
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              triggerHaptic(HAPTIC_PATTERNS.light);
              setActiveTab('More');
              setMoreMenuKey(k => k + 1);
              handleClearPreSelectedTool();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 text-center transition relative outline-none select-none ${
              ['More', 'Leave', 'Attendance', 'Day Summary', 'Users'].includes(activeTab)
                ? 'text-red-500 font-bold' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileSliders className={`w-4.5 h-4.5 mb-1 transition-transform duration-250 ${['More', 'Leave', 'Attendance', 'Day Summary', 'Users'].includes(activeTab) ? 'scale-110 text-red-500' : ''}`} />
            <span className="text-[10px] font-semibold font-mono tracking-tight">Auxiliary</span>
            {['More', 'Leave', 'Attendance', 'Day Summary', 'Users'].includes(activeTab) && (
              <motion.span 
                layoutId="active-nav-glow" 
                className="absolute -top-2 w-6 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] rounded-full" 
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>

        </div>
      </nav>

    </div>
  );
}
