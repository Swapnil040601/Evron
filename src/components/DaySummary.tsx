/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Employee } from '../types';
import { Calendar, Users, Clock, AlertOctagon, Heart, Building, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

interface DaySummaryProps {
  employees: Employee[];
}

export default function DaySummary({ employees }: DaySummaryProps) {
  // Date selection state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Dynamically calculate statistics from the selected list
  const totalRoster = employees.length;
  const present = employees.filter(e => e.status === 'Present').length;
  const late = employees.filter(e => e.status === 'Late').length;
  const leaves = employees.filter(e => e.status === 'On Leave').length;
  const absents = employees.filter(e => e.status === 'Absent').length;
  const scansAccuracy = 99.4; // constant calibrated matched precision

  // Department ratios (hardcoded or semi-dynamic based on roster)
  const departments = [
    { name: 'Engineering', total: 4, present: 3, color: 'bg-emerald-500' },
    { name: 'Operations', total: 2, present: 1, color: 'bg-amber-500' },
    { name: 'Design', total: 1, present: 1, color: 'bg-emerald-500' },
    { name: 'Security', total: 1, present: 1, color: 'bg-emerald-500' },
    { name: 'HR', total: 1, present: 0, color: 'bg-rose-500' }
  ];

  // Hourly stats check-ins representing beautiful custom layout
  const hourlyCheckins = [
    { hour: '07:00 AM', count: 1, detail: 'Early (Security force)' },
    { hour: '08:00 AM', count: 3, detail: 'Peak Jenkins / Okafor' },
    { hour: '09:00 AM', count: 2, detail: 'Rostova / Mendez' },
    { hour: '10:00 AM', count: 1, detail: 'Chen Late arrival' },
    { hour: '11:00 AM', count: 0, detail: 'Zero match entries' },
    { hour: '12:00 PM', count: 0, detail: 'Zero match entries' },
    { hour: '01:00 PM', count: 1, detail: 'Late lunch logs check' }
  ];

  // Function to offset days
  const handleDayStep = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (direction === 'prev' ? -1 : 1));
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6" id="day-summary-screen">
      {/* Upper header controls with Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Daily Audit Record</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Consolidated operational telemetry per 24-hour bracket</p>
        </div>

        {/* Calendar Picker Block */}
        <div className="flex items-center gap-2 bg-zinc-950 theme-light:bg-white theme-light:border-zinc-300 p-1.5 rounded-lg border border-zinc-800" id="date-picker-widget">
          <button
            onClick={() => handleDayStep('prev')}
            className="p-1 hover:bg-zinc-900 theme-light:hover:bg-zinc-100 rounded text-zinc-400 hover:text-white theme-light:text-zinc-600 theme-light:hover:text-zinc-900 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-3.5 h-3.5 text-[#ef4444]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs text-white theme-light:text-zinc-800 border-none focus:outline-none font-mono font-bold cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleDayStep('next')}
            className="p-1 hover:bg-zinc-900 theme-light:hover:bg-zinc-100 rounded text-zinc-400 hover:text-white theme-light:text-zinc-600 theme-light:hover:text-zinc-900 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" id="six-stat-cards">
        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 font-mono block">TOTAL ROSTER</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white font-sans">{totalRoster}</span>
            <Users className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-[9px] text-zinc-400 font-mono block mt-1">Full shift capacity</span>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-emerald-400 font-mono block font-semibold">CHECKED-IN (OK)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white font-sans">{present}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[9px] text-[#22c55e]/90 font-mono block mt-1">On-premises matched</span>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-amber-400 font-mono block">LATE ARRIVAL</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white font-sans">{late}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-[9px] text-amber-500/80 font-mono block mt-1">Clock thresholds breached</span>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-blue-400 font-mono block">ACTIVE LEAVES</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white font-sans">{leaves}</span>
            <Heart className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-[9px] text-blue-400/85 font-mono block mt-1">Approved exemptions</span>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-rose-400 font-mono block">OFF-PREMISES</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white font-sans">{absents}</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-[9px] text-rose-500/85 font-mono block mt-1">No scanned signals</span>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-teal-400 font-mono block font-semibold">SCAN ACCURACY</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white font-sans">{scansAccuracy}%</span>
            <Building className="w-4 h-4 text-teal-400" />
          </div>
          <span className="text-[9px] text-teal-400/85 font-mono block mt-1">Edge computer match</span>
        </div>
      </div>

      {/* Main Layout containing Bar Chart and Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="day-summary-body">
        
        {/* Hourly Check-In Bar Chart (lg: 7) */}
        <div className="lg:col-span-7 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5" id="hourly-check-ins-column">
          <div className="border-b border-zinc-800 pb-3 mb-5">
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#ef4444] uppercase">Hourly Scanned Access Curve</h3>
            <p className="text-xs text-zinc-400 mt-1">Aggregated check-in load registered via all entry units</p>
          </div>

          {/* Custon CSS Bar Chart */}
          <div className="space-y-6 pt-2">
            <div className="flex items-end justify-between h-48 gap-3 px-2 border-b border-zinc-800" id="bars-viewport">
              {hourlyCheckins.map((item) => {
                const maxVal = 3;
                const barPct = Math.max(8, (item.count / maxVal) * 100);

                return (
                  <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 group relative">
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-950 text-white text-[10px] font-mono p-1.5 rounded border border-zinc-700 w-24 text-center z-10 shadow-2xl">
                      <strong className="text-white block">{item.count} check-ins</strong>
                      <span className="text-[9px] text-zinc-400">{item.detail}</span>
                    </div>

                    {/* Interactive CSS Bar */}
                    <div className="w-full bg-zinc-900 rounded-t-lg overflow-hidden h-40 flex items-end">
                      <div
                        style={{ height: `${barPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 cursor-pointer ${
                          item.count > 0 
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 hover:opacity-80' 
                            : 'bg-zinc-950/20'
                        }`}
                      />
                    </div>
                    
                    {/* Tick Label */}
                    <span className="text-[9px] text-zinc-500 font-mono transform rotate-12 sm:rotate-0 tracking-tight sm:mt-1">
                      {item.hour.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono px-1">
              <span>07:00 AM (Early doors)</span>
              <span>01:00 PM (Late Shift starts)</span>
            </div>
          </div>
        </div>

        {/* Department Breakdown List (lg: 5) */}
        <div className="lg:col-span-12 xl:col-span-5 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5" id="dept-breakdown-column">
          <div className="border-b border-zinc-800 pb-3 mb-4">
            <h3 className="text-xs font-bold font-mono tracking-widest text-[#ef4444] uppercase">Department Integrity Scanners</h3>
            <p className="text-xs text-zinc-400 mt-1">Ratios of active personnel present per business unit</p>
          </div>

          <div className="space-y-4" id="dept-compliance-pills">
            {departments.map((dept) => {
              const compliancePct = Math.round((dept.present / dept.total) * 100) || 0;
              return (
                <div key={dept.name} className="bg-zinc-950 p-3.5 border border-zinc-900 rounded-lg hover:border-zinc-800 transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{dept.name} Division</span>
                    <span className="text-xs font-bold font-mono text-zinc-300">
                      {dept.present} / {dept.total} present <b className="text-zinc-500">({compliancePct}%)</b>
                    </span>
                  </div>

                  {/* Segment micro line */}
                  <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      style={{ width: `${compliancePct}%` }}
                      className={`h-full rounded-full ${dept.color} transition-all duration-700`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
