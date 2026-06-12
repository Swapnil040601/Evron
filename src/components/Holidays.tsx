/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Holiday } from '../types';
import { Calendar, Inbox, Plus, Award } from 'lucide-react';

interface HolidaysProps {
  holidays: Holiday[];
}

export default function Holidays({ holidays }: HolidaysProps) {
  return (
    <div className="space-y-6" id="holidays-config-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Calendar Holidays</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Archive and review scheduled roster exceptions</p>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-white rounded-lg text-xs font-mono transition">
          <Plus className="w-3.5 h-3.5 text-rose-500" />
          ADD HOLIDAY CALENDAR
        </button>
      </div>

      {/* Holiday layout table */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold font-mono text-[#ef4444] tracking-widest uppercase">Upcoming Exceptions List</h2>

        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 font-mono text-[10px] uppercase tracking-wider border-b border-zinc-850">
                  <th className="py-3 px-4">Holiday / Name</th>
                  <th className="py-3 px-4">Expected Date</th>
                  <th className="py-3 px-4">Day of Week</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">System Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 font-mono text-zinc-300">
                {holidays.map(h => {
                  let badge = 'bg-blue-950/40 text-blue-300 border-blue-800/30';
                  if (h.type === 'National') { badge = 'bg-rose-950/40 text-rose-300 border-rose-800/30'; }
                  else if (h.type === 'Restricted') { badge = 'bg-purple-950/40 text-purple-300 border-purple-800/30'; }

                  return (
                    <tr key={h.id} className="hover:bg-zinc-900/30 transition">
                      <td className="py-3 px-4 font-bold text-white">
                        {h.name}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {h.date}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {h.day}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${badge}`}>
                          {h.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[10px] text-emerald-400 flex items-center justify-end gap-1 font-semibold uppercase">
                          <Award className="w-3.5 h-3.5" />
                          Auto-Excuse logs
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
