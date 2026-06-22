/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Employee, ActivityLog } from '../types';
import { Users, UserCheck, UserMinus, Calendar, ArrowRight, Video, ListFilter, Users2, Moon, Utensils, Zap, FileSliders, Smartphone, ShieldAlert } from 'lucide-react';
import { apiService } from '../services/api';

interface DashboardProps {
  employees: Employee[];
  activityLogs: ActivityLog[];
  onNavigate: (screen: string, filter?: string) => void;
  onNavigateMoreTool: (tool: string) => void;
  pendingLeavesCount: number;
}

export default function Dashboard({
  employees,
  activityLogs,
  onNavigate,
  onNavigateMoreTool,
  pendingLeavesCount
}: DashboardProps) {
  // Compute counts dynamically
  const total = employees.length;
  const present = employees.filter(e => e.status === 'Present').length;
  const late = employees.filter(e => e.status === 'Late').length;
  const leave = employees.filter(e => e.status === 'On Leave').length;
  const absent = employees.filter(e => e.status === 'Absent').length;

  // Attendance rate target calculation
  const presentPct = Math.round((present / total) * 100) || 0;
  const latePct = Math.round((late / total) * 100) || 0;
  const leavePct = Math.round((leave / total) * 100) || 0;
  const absentPct = Math.round((absent / total) * 100) || 0;

  return (
    <div className="space-y-6" id="dashboard-screen-container">
      {/* Upper Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Dashboard</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            System status: <span className="text-emerald-400 font-semibold animate-pulse">● OPERATIONAL</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('Day Summary')}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-zinc-800 transition shadow-inner font-mono"
            id="dash-day-summary-btn"
          >
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            TODAY SUMMARY
          </button>
          <button
            onClick={() => onNavigate('Users')}
            className="flex items-center gap-2 bg-emerald-600 border border-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-emerald-500 transition shadow font-mono"
            id="dash-view-staff-btn"
          >
            <Users className="w-3.5 h-3.5" />
            MANAGE STAFF
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" id="stats-grid-row">
        <motion.div 
          onClick={() => onNavigate('Attendance', 'Present')}
          whileHover={{ scale: 1.025, borderColor: "rgba(16, 185, 129, 0.45)", backgroundColor: "rgba(24, 24, 27, 0.85)" }}
          whileTap={{ scale: 0.98 }}
          className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors shadow-sm" 
          id="stat-present"
          title="Click to view all Present employees"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono tracking-wider">Present</span>
            <UserCheck className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{present}</span>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{presentPct}% of total staff</p>
          </div>
        </motion.div>

        <motion.div 
          onClick={() => onNavigate('Attendance', 'Late')}
          whileHover={{ scale: 1.025, borderColor: "rgba(245, 158, 11, 0.45)", backgroundColor: "rgba(24, 24, 27, 0.85)" }}
          whileTap={{ scale: 0.98 }}
          className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors shadow-sm" 
          id="stat-late"
          title="Click to view all Late employees"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono tracking-wider">Late</span>
            <Zap className="w-4.5 h-4.5 text-amber-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{late}</span>
            <span className="text-xs text-amber-500 font-mono ml-2 font-semibold">-{latePct}%</span>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Arrived late</p>
          </div>
        </motion.div>

        <motion.div 
          onClick={() => onNavigate('Attendance', 'Absent')}
          whileHover={{ scale: 1.025, borderColor: "rgba(244, 63, 94, 0.45)", backgroundColor: "rgba(24, 24, 27, 0.85)" }}
          whileTap={{ scale: 0.98 }}
          className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors shadow-sm" 
          id="stat-absent"
          title="Click to view all Absent employees"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono tracking-wider">Absent</span>
            <UserMinus className="w-4.5 h-4.5 text-rose-500" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{absent}</span>
            <span className="text-xs text-rose-500 font-mono ml-2">({absentPct}%)</span>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Not checked in</p>
          </div>
        </motion.div>

        <motion.div 
          onClick={() => onNavigate('Leave')}
          whileHover={{ scale: 1.025, borderColor: "rgba(59, 130, 246, 0.45)", backgroundColor: "rgba(24, 24, 27, 0.85)" }}
          whileTap={{ scale: 0.98 }}
          className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between cursor-pointer transition-colors shadow-sm" 
          id="stat-leave"
          title="Click to view Leave Approvals panel"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-mono tracking-wider">On Leave</span>
            <Moon className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">{leave}</span>
            {pendingLeavesCount > 0 && (
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded ml-2 border border-amber-500/20 font-semibold font-mono animate-pulse">
                {pendingLeavesCount} pending
              </span>
            )}
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">On leave today</p>
          </div>
        </motion.div>

      </div>

      {/* Today's Attendance segmented progress bar */}
      <div className="bg-zinc-900/70 theme-light:bg-white/80 border border-zinc-800/80 theme-light:border-zinc-200 rounded-xl p-5" id="attendance-ratio-container">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <span className="text-xs font-bold font-mono tracking-widest text-[#ef4444]">TODAY'S ATTENDANCE</span>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Roster: <span className="font-semibold text-white">{present + late}/{total} logged</span>
          </span>
        </div>

        {/* The complex Segmented Bar representing categories */}
        <div className="w-full flex h-4 rounded-full overflow-hidden bg-zinc-800 mb-4 shadow-inner" id="attendance-segmented-bar">
          {presentPct > 0 && (
            <div
              style={{ width: `${presentPct}%` }}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 h-full transition-all duration-500 hover:opacity-90 relative group"
              title={`Present: ${present} (${presentPct}%)`}
            />
          )}
          {latePct > 0 && (
            <div
              style={{ width: `${latePct}%` }}
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-500 hover:opacity-90 relative group"
              title={`Late: ${late} (${latePct}%)`}
            />
          )}
          {leavePct > 0 && (
            <div
              style={{ width: `${leavePct}%` }}
              className="bg-gradient-to-r from-blue-600 to-blue-500 h-full transition-all duration-500 hover:opacity-90 relative group"
              title={`On Leave: ${leave} (${leavePct}%)`}
            />
          )}
          {absentPct > 0 && (
            <div
              style={{ width: `${absentPct}%` }}
              className="bg-gradient-to-r from-rose-600 to-rose-500 h-full transition-all duration-500 hover:opacity-90 relative group"
              title={`Absent: ${absent} (${absentPct}%)`}
            />
          )}
        </div>

        {/* Legend pills with stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs mt-2" id="attendance-legend-pills">
          <motion.div 
            onClick={() => onNavigate('Attendance', 'Present')}
            whileHover={{ scale: 1.02, borderColor: "rgba(16, 185, 129, 0.45)", backgroundColor: "rgba(24, 24, 27, 0.9)" }}
            whileTap={{ scale: 0.97 }}
            className="bg-zinc-900 border border-emerald-500/20 py-2 rounded-lg flex items-center justify-between px-3 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-zinc-300 font-medium">Present</span>
            </div>
            <span className="font-bold text-white font-mono">{present} ({presentPct}%)</span>
          </motion.div>

          <motion.div 
            onClick={() => onNavigate('Attendance', 'Late')}
            whileHover={{ scale: 1.02, borderColor: "rgba(245, 158, 11, 0.45)", backgroundColor: "rgba(24, 24, 27, 0.9)" }}
            whileTap={{ scale: 0.97 }}
            className="bg-zinc-900 border border-amber-500/20 py-2 rounded-lg flex items-center justify-between px-3 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-zinc-300 font-medium">Late</span>
            </div>
            <span className="font-bold text-white font-mono">{late} ({latePct}%)</span>
          </motion.div>

          <motion.div 
            onClick={() => onNavigate('Leave')}
            whileHover={{ scale: 1.02, borderColor: "rgba(59, 130, 246, 0.45)", backgroundColor: "rgba(24, 24, 27, 0.9)" }}
            whileTap={{ scale: 0.97 }}
            className="bg-zinc-900 border border-blue-500/20 py-2 rounded-lg flex items-center justify-between px-3 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-zinc-300 font-medium">On Leave</span>
            </div>
            <span className="font-bold text-white font-mono">{leave} ({leavePct}%)</span>
          </motion.div>

          <motion.div 
            onClick={() => onNavigate('Attendance', 'Absent')}
            whileHover={{ scale: 1.02, borderColor: "rgba(244, 63, 94, 0.45)", backgroundColor: "rgba(24, 24, 27, 0.9)" }}
            whileTap={{ scale: 0.97 }}
            className="bg-zinc-900 border border-rose-500/20 py-2 rounded-lg flex items-center justify-between px-3 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-zinc-300 font-medium">Absent</span>
            </div>
            <span className="font-bold text-white font-mono">{absent} ({absentPct}%)</span>
          </motion.div>
        </div>
      </div>

      {/* Main Content Layout with recent activity split and quick launch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-content-grid">
        {/* Activity Feed Column (lg: 7) */}
        <div className="lg:col-span-7 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between" id="activity-feed-card">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                <h3 className="font-bold tracking-tight text-white font-mono text-xs uppercase">Recent Activity</h3>
              </div>
              <button
                onClick={() => onNavigate('Productivity')}
                className="text-xs text-[#ef4444] hover:text-[#f87171] font-semibold flex items-center gap-1 hover:underline font-mono"
              >
                View Live <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1" id="logs-feed">
              {activityLogs.map((log) => {
                let badgeColor = 'bg-zinc-800 text-zinc-300 border-zinc-700';
                let iconMarker = 'bg-zinc-500';

                if (log.type === 'check_in') {
                  badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  iconMarker = 'bg-emerald-500';
                } else if (log.type === 'check_out') {
                  badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  iconMarker = 'bg-blue-500';
                } else if (log.type === 'alert') {
                  badgeColor = log.status === 'critical'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                  iconMarker = log.status === 'critical' ? 'bg-rose-500 animate-ping' : 'bg-amber-500';
                }

                return (
                  <div key={log.id} className="relative pl-6 border-l border-zinc-800/80 pb-1 py-1 group hover:bg-zinc-800/25 rounded-md transition duration-150">
                    <span className={`absolute -left-1 top-2.5 w-2 h-2 rounded-full ${iconMarker}`} />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.employeeName && (
                          <span className="text-zinc-100 font-semibold text-xs">{log.employeeName}</span>
                        )}
                        {log.role && (
                          <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                            {log.role}
                          </span>
                        )}
                        {log.cameraName && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            via {log.cameraName}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono self-start sm:self-center bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800/80">
                        {log.time}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1">{log.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Navigate Actions Column (lg: 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4" id="quick-links-card">
          {/* Quick Actions Panel */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold tracking-widest text-[#ef4444] font-mono uppercase mb-4 pb-2 border-b border-zinc-800/60">
                Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-3" id="shortcuts-grid">
                <button
                  onClick={() => onNavigate('Attendance')}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/50 transition text-center group"
                >
                  <ListFilter className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition mb-2" />
                  <span className="text-xs text-zinc-200 font-semibold">Attendance Log</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">Daily / Heatmaps</span>
                </button>

                <button
                  onClick={() => onNavigate('Leave')}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/50 transition text-center group relative"
                >
                  {pendingLeavesCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  )}
                  <Moon className="w-5 h-5 text-blue-400 group-hover:scale-110 transition mb-2" />
                  <span className="text-xs text-zinc-200 font-semibold">Leave Approvals</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">{pendingLeavesCount} Pending Review</span>
                </button>

                <button
                  onClick={() => onNavigate('Productivity')}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/50 transition text-center group"
                >
                  <Video className="w-5 h-5 text-[#ef4444] group-hover:scale-110 transition mb-2" />
                  <span className="text-xs text-zinc-200 font-semibold">Surveillance</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">2x2 grid live track</span>
                </button>

                <button
                  onClick={() => onNavigate('Users')}
                  className="flex flex-col items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/50 transition text-center group"
                >
                  <Users2 className="w-5 h-5 text-teal-400 group-hover:scale-110 transition mb-2" />
                  <span className="text-xs text-zinc-200 font-semibold">Staff List</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">View & edit staff</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Admin More Tools Launch */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-xs font-bold tracking-widest text-[#ef4444] font-mono uppercase mb-3">
              Quick Links
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-[10px] font-mono text-zinc-300">
              <button
                onClick={() => onNavigateMoreTool('Canteen')}
                className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg hover:border-emerald-500/40 transition flex flex-col items-center gap-1.5"
              >
                <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                <span>Canteen</span>
              </button>
              <button
                onClick={() => onNavigateMoreTool('Shifts')}
                className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg hover:border-amber-500/40 transition flex flex-col items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Shifts</span>
              </button>
              <button
                onClick={() => onNavigateMoreTool('Settings')}
                className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg hover:border-blue-500/40 transition flex flex-col items-center gap-1.5"
              >
                <FileSliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Settings</span>
              </button>
              <button
                onClick={() => onNavigateMoreTool('ReactNative')}
                className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg hover:border-[#61dafb]/40 transition flex flex-col items-center gap-1.5 text-zinc-300 hover:text-white"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#61dafb]" />
                <span>Mobile App</span>
              </button>
              <button
                onClick={() => onNavigateMoreTool('Productivity')}
                className="p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg hover:border-red-500/40 transition flex flex-col items-center gap-1.5 text-zinc-300 hover:text-white"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span>Productivity</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
