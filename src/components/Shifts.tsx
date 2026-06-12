/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shift } from '../types';
import { Clock, ShieldCheck, Users, Info, Settings } from 'lucide-react';

interface ShiftsProps {
  shifts: Shift[];
}

export default function Shifts({ shifts }: ShiftsProps) {
  return (
    <div className="space-y-6" id="shifts-manager-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Company Shifts & Rosters</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Configure biometric scanning windows and attendance thresholds</p>
        </div>
      </div>

      {/* Grid of 4 Shift Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="shifts-cards-grid">
        {shifts.map((s) => {
          let cardColor = 'border-l-4 border-l-emerald-500';
          if (s.id === 'SHF-04') { cardColor = 'border-l-4 border-l-rose-500 bg-rose-950/5'; }
          else if (s.id === 'SHF-02') { cardColor = 'border-l-4 border-l-blue-500'; }
          else if (s.id === 'SHF-03') { cardColor = 'border-l-4 border-l-amber-500'; }

          return (
            <div
              key={s.id}
              className={`bg-zinc-900/40 border border-zinc-805 rounded-xl p-5 hover:border-zinc-700 transition flex flex-col justify-between ${cardColor}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-semibold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-850">
                    {s.id} · {s.type}
                  </span>
                  <Settings className="w-3.5 h-3.5 text-zinc-600 hover:text-white transition cursor-pointer" />
                </div>

                <h3 className="text-sm font-bold text-white tracking-tight">{s.name}</h3>
                
                {/* Specific features */}
                <div className="grid grid-cols-2 gap-4 mt-5 mb-2 text-xs font-mono">
                  <div className="bg-zinc-950/40 border border-zinc-850 p-2 rounded-lg flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-500">SHIFT WIND WINDOW</span>
                    <span className="text-white flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      {s.timeRange}
                    </span>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-850 p-2 rounded-lg flex flex-col gap-1">
                    <span className="text-[9px] text-zinc-500">GRACE THRESHOLD</span>
                    <span className="text-zinc-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-500" />
                      {s.gracePeriod}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t border-zinc-800/60 pt-3 mt-4 flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  Staff Assigned: <strong className="text-white">{s.assignedStaffCount} subjects</strong>
                </span>

                <button className="text-[10px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-300 px-3 py-1 rounded-md transition duration-150">
                  EDIT MEMBERS
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Info Warning */}
      <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl flex items-start gap-3">
        <Info className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
          WARNING: Modifying active shift windows causes automatic recalibration of today's Present/Late calculations. Employees already checked in will NOT be back-adjusted. Set SMTP flags to alert affected members.
        </p>
      </div>

    </div>
  );
}
