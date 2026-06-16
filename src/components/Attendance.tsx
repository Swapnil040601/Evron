/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { Calendar, Search, Filter, ShieldCheck, Clock, UserMinus, UserCheck, Flame, Moon, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';

interface AttendanceProps {
  employees: Employee[];
  onNavigate: (screen: string) => void;
  initialFilter?: 'All' | 'Present' | 'Late' | 'Absent' | 'On Leave';
}

export default function Attendance({ employees, onNavigate, initialFilter }: AttendanceProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'all-staff'>('daily');
  
  // State for Daily tab
  const [dailyFilter, setDailyFilter] = useState<'All' | 'Present' | 'Late' | 'Absent' | 'On Leave'>(initialFilter || 'All');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state if initialFilter prop changes
  useEffect(() => {
    if (initialFilter) {
      setDailyFilter(initialFilter);
    }
  }, [initialFilter]);

  // Daily filtered list
  const filteredDailyEmployees = employees.filter(emp => {
    const matchesFilter = dailyFilter === 'All' || emp.status === dailyFilter;
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          emp.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Real monthly attendance heatmap state
  const now = new Date();
  const [heatmapYM, setHeatmapYM] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [heatmapData, setHeatmapData] = useState<{ dayNum: number; rate: number }[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  const fetchHeatmap = async (year: number, month: number) => {
    setHeatmapLoading(true);
    try {
      const records = await apiService.getMonthlyAttendance({ year, month, user_id: null });
      const daysCount = new Date(year, month, 0).getDate();
      const totalEmp = Math.max(employees.length, 1);

      // group by day
      const dayPresent: Record<number, number> = {};
      records.forEach(r => {
        const d = parseInt(typeof r.date === 'string' ? r.date.slice(8, 10) : '0', 10);
        if (r.status === 'Present' || r.status === 'Late') {
          dayPresent[d] = (dayPresent[d] || 0) + 1;
        }
      });

      setHeatmapData(Array.from({ length: daysCount }, (_, i) => {
        const dayNum = i + 1;
        const date = new Date(year, month - 1, dayNum);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (isWeekend) return { dayNum, rate: 0 };
        const present = dayPresent[dayNum] || 0;
        return { dayNum, rate: Math.round((present / totalEmp) * 100) };
      }));
    } catch {
      setHeatmapData([]);
    } finally {
      setHeatmapLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchHeatmap(heatmapYM.year, heatmapYM.month);
    }
  }, [activeTab, heatmapYM, employees.length]);

  const heatmapMonthLabel = new Date(heatmapYM.year, heatmapYM.month - 1, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  const firstDayOfWeek = (() => {
    // Mon=0 … Sun=6
    const d = new Date(heatmapYM.year, heatmapYM.month - 1, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  return (
    <div className="space-y-6" id="attendance-screen">
      {/* Tab Navigation header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Attendance Ledger</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Biometric face match audit registers</p>
        </div>

        {/* Dynamic Buttons for 3 Tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 max-w-md">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'daily'
                ? 'bg-[#ef4444] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            DAILY LOG
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'monthly'
                ? 'bg-[#ef4444] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            MONTHLY HEATMAP
          </button>
          <button
            onClick={() => setActiveTab('all-staff')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold font-mono transition ${
              activeTab === 'all-staff'
                ? 'bg-[#ef4444] text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            ROSTER STATS
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'daily' && (
        <div className="space-y-4" id="daily-attendance-tab">
          {/* Daily Controls: Search + Filter Pills */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/80">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by staff name, role, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500/50 transition font-mono placeholder:text-zinc-600"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Present', 'Late', 'Absent', 'On Leave'] as const).map((status) => {
                const isActive = dailyFilter === status;
                let pillClass = '';
                if (isActive) {
                  pillClass = 'bg-zinc-100 text-zinc-900 border-zinc-100 font-bold';
                } else {
                  pillClass = 'text-zinc-400 bg-zinc-950 border-zinc-800 hover:text-white hover:border-zinc-700';
                }

                return (
                  <button
                    key={status}
                    onClick={() => setDailyFilter(status)}
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono transition shadow-sm ${pillClass}`}
                  >
                    {status === 'All' ? 'ALL STAFF' : status.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Staff Grid/Table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-normal">Employee / Face ID</th>
                    <th className="py-3.5 px-4 font-normal">Department</th>
                    <th className="py-3.5 px-4 font-normal">Status</th>
                    <th className="py-3.5 px-4 font-normal">In/Out Times</th>
                    <th className="py-3.5 px-4 font-normal">Contact No.</th>
                    <th className="py-3.5 px-4 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredDailyEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs font-mono">
                        No active records match the selected status filter pill or search query.
                      </td>
                    </tr>
                  ) : (
                    filteredDailyEmployees.map((emp, idx) => {
                      let statusBadge = '';
                      if (emp.status === 'Present') {
                        statusBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      } else if (emp.status === 'Late') {
                        statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      } else if (emp.status === 'Absent') {
                        statusBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                      } else {
                        statusBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      }

                      return (
                        <tr key={`${emp.id}-${idx}`} className="hover:bg-zinc-800/20 transition group">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={emp.avatar}
                                alt={emp.name}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full object-cover border border-zinc-800 group-hover:border-zinc-700"
                              />
                              <div>
                                <h4 className="text-xs font-bold text-white leading-tight">{emp.name}</h4>
                                <span className="text-[10px] text-zinc-400 font-mono block mt-0.5 uppercase">
                                  {emp.role}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs text-zinc-300 font-semibold font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                              {emp.department}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                              {emp.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            {emp.status === 'Present' || emp.status === 'Late' ? (
                              <div className="flex flex-col">
                                <span className="text-zinc-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-400" /> In: {emp.checkInTime}
                                </span>
                                <span className="text-[10px] text-zinc-500">Out: Pending checkout</span>
                              </div>
                            ) : emp.status === 'On Leave' ? (
                              <span className="text-blue-400">Scheduled Sick/Casual</span>
                            ) : (
                              <span className="text-zinc-600">— No Logs Scanned —</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-zinc-400">
                            {emp.phone}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                onNavigate('Day Summary');
                              }}
                              className="text-xs bg-zinc-950 text-[#ef4444] border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded hover:bg-zinc-900 transition font-mono"
                            >
                              PROFILE SUMMARY
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY HEATMAP TAB */}
      {activeTab === 'monthly' && (
        <div className="space-y-6" id="monthly-heatmap-tab">
          {/* Legend and month navigation */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#ef4444] font-mono tracking-wider">MONTH REVIEW // {heatmapMonthLabel}</span>
              <h3 className="text-sm font-semibold text-zinc-200">Attendance Heatmap</h3>
              <p className="text-xs text-zinc-400">Ratio of staff present vs total. Weekends shown as OFF.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHeatmapYM(prev => {
                  const d = new Date(prev.year, prev.month - 2, 1);
                  return { year: d.getFullYear(), month: d.getMonth() + 1 };
                })}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400 hover:text-white font-mono"
              >←</button>
              <span className="text-xs font-mono text-zinc-300 min-w-[120px] text-center">{heatmapMonthLabel}</span>
              <button
                onClick={() => setHeatmapYM(prev => {
                  const d = new Date(prev.year, prev.month, 1);
                  return { year: d.getFullYear(), month: d.getMonth() + 1 };
                })}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-400 hover:text-white font-mono"
              >→</button>
              <button
                onClick={() => fetchHeatmap(heatmapYM.year, heatmapYM.month)}
                className="p-1.5 bg-zinc-900 border border-zinc-800 rounded hover:border-red-500 transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${heatmapLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-3 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-[10px] font-mono text-zinc-300">
              <span className="text-zinc-500">Low</span>
              <span className="w-3 h-3 rounded bg-rose-950 border border-rose-600/50" />
              <span className="w-3 h-3 rounded bg-amber-950 border border-amber-600/50" />
              <span className="w-3 h-3 rounded bg-emerald-900 border border-emerald-600/50" />
              <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-400/50" />
              <span>High</span>
            </div>
          </div>

          {heatmapLoading ? (
            <div className="py-20 text-center font-mono text-zinc-500 text-xs animate-pulse flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
              Loading attendance data...
            </div>
          ) : (
          <div className="grid grid-cols-7 gap-2.5 max-w-4xl mx-auto p-4 bg-zinc-950 border border-zinc-800 rounded-xl" id="heatmap-calendar-grid">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(wd => (
              <div key={wd} className="text-center text-[10px] text-zinc-500 font-bold font-mono py-1">{wd}</div>
            ))}

            {/* Dynamic offset based on actual first day of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`space-${i}`} className="aspect-square bg-zinc-900/10 border border-zinc-800/10 rounded-lg" />
            ))}

            {heatmapData.map(({ dayNum, rate }) => {
              const date = new Date(heatmapYM.year, heatmapYM.month - 1, dayNum);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              let cellBg = 'bg-zinc-900/40 border-zinc-800 text-zinc-500';
              let percentLabel = '–';

              if (isWeekend) {
                cellBg = 'bg-zinc-950 border-zinc-900 text-zinc-600';
                percentLabel = 'OFF';
              } else if (rate === 0) {
                cellBg = 'bg-zinc-900/30 border-zinc-850 text-zinc-600';
                percentLabel = '0%';
              } else {
                percentLabel = `${rate}%`;
                if (rate >= 80) cellBg = 'bg-emerald-900/60 hover:bg-emerald-800 border-emerald-500/40 text-emerald-200';
                else if (rate >= 50) cellBg = 'bg-amber-950/60 hover:bg-amber-900 border-amber-500/40 text-amber-200';
                else cellBg = 'bg-rose-950/60 hover:bg-rose-900 border-rose-500/40 text-rose-200';
              }

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`aspect-square p-2.5 rounded-lg border flex flex-col justify-between transition group relative cursor-pointer ${cellBg}`}
                >
                  <span className="text-[11px] font-bold font-mono">{dayNum}</span>
                  <span className="text-[9px] font-mono tracking-tighter opacity-80 mt-auto">{percentLabel}</span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-10 w-28 bg-zinc-950 text-white rounded p-1.5 border border-zinc-700 text-[10px] font-mono shadow-2xl">
                    <span className="font-semibold text-zinc-300">{dayNum} {heatmapMonthLabel.split(' ')[0]}</span>
                    <span className={`mt-0.5 ${isWeekend ? 'text-zinc-500' : rate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isWeekend ? 'Weekend' : rate === 0 ? 'No Records' : `Present: ${rate}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* ALL STAFF PROGRESS BARS */}
      {activeTab === 'all-staff' && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-6" id="all-staff-attendance-rates">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-zinc-800 pb-3">
            <div>
              <span className="text-xs font-bold text-[#ef4444] font-mono tracking-wider">MONTHLY COMPLIANCE RATING</span>
              <p className="text-xs text-zinc-400">Detailed metric representation of team consistency scores</p>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300">
              <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>Target Rate limit: <b className="text-white">90% compliance</b></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="compliance-bars-grid">
            {employees.map((emp, idx) => {
              const meetsTarget = emp.attendanceRate >= 92;
              const fillBarColor = meetsTarget 
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                : 'bg-gradient-to-r from-amber-500 to-rose-500';
              
              return (
                <div key={`${emp.id}-${idx}`} className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl flex items-center gap-4 hover:border-zinc-700 transition">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-zinc-800"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-white truncate">{emp.name}</h4>
                      <span className="text-xs font-bold font-mono text-white text-right">{emp.attendanceRate}%</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono mb-2 truncate">{emp.role} · {emp.department}</p>
                    
                    {/* Progress tracking line */}
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden shadow-inner">
                      <div
                        style={{ width: `${emp.attendanceRate}%` }}
                        className={`${fillBarColor} h-full rounded-full transition-all duration-700`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
