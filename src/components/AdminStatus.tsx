/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SecurityEvent } from '../types';
import { Flame, ShieldCheck, Cpu, Terminal, Plus, Radio, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface AdminStatusProps {
  mode: 'Fire' | 'Secured' | 'Monitor';
  events: SecurityEvent[];
  onAddEvent: (event: SecurityEvent) => void;
}

export default function AdminStatus({ mode, events, onAddEvent }: AdminStatusProps) {
  const [newEventMsg, setNewEventMsg] = useState('');
  const [newEventSeverity, setNewEventSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  // Filter security events matching the current mode
  const filteredEvents = events.filter(evt => evt.source === mode);

  // Triggered test logging action
  const handleLogEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventMsg) { return; }

    const formatTimestamp = () => {
      const now = new Date();
      let hour = now.getHours();
      const min = String(now.getMinutes()).padStart(2, '0');
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `2026-05-24 ${String(hour).padStart(2, 'o')}:${min} ${ampm}`;
    };

    const newEvt: SecurityEvent = {
      id: `SE00${events.length + 1}`,
      source: mode,
      type: newEventSeverity,
      message: newEventMsg,
      timestamp: formatTimestamp()
    };

    onAddEvent(newEvt);
    setNewEventMsg('');
  };

  // Determine metadata headers based on selected Admin Mode
  let mainIcon = <Cpu className="w-8 h-8 text-emerald-400" />;
  let screenTitle = 'Core System Health';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let overallState = 'OPERATIONAL (NOMINAL)';
  let technicalDetail = 'All physical and virtual sensor sectors reported healthy metrics and logs.';

  if (mode === 'Fire') {
    mainIcon = <Flame className="w-8 h-8 text-rose-500 animate-pulse" />;
    screenTitle = 'Thermal & Gas Integrity Status';
    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    overallState = 'SECURE (NO SMOKE)';
    technicalDetail = 'Laser particulate detectors and CO2 index scanners calibrated on-line.';
  } else if (mode === 'Secured') {
    mainIcon = <ShieldCheck className="w-8 h-8 text-blue-400" />;
    screenTitle = 'Intrusion Guard & Access Status';
    badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    overallState = 'LOCK SECURE (100%)';
    technicalDetail = 'Access portals, turnstiles and server vaults locked correctly.';
  } else if (mode === 'Monitor') {
    mainIcon = <Cpu className="w-8 h-8 text-amber-500" />;
    screenTitle = 'Hardware & Storage Resource Status';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    overallState = 'STORAGE HEAVY (87%)';
    technicalDetail = 'NVR storage array pools active with smart retention rules.';
  }

  return (
    <div className="space-y-6" id="admin-status-view-panel">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 shrink-0">
            {mainIcon}
          </div>
          <div>
            <span className="text-xs font-bold text-[#ef4444] font-mono tracking-wider block w-full">SECURE AUDIT CONTROL MODE</span>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl mt-1">{screenTitle}</h1>
          </div>
        </div>
      </div>

      {/* RENDER MODE SPECIFIC CORE METRICS OR DIAGNOSTICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="admin-diagnostics-grid">
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl text-white flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">SYSTEM THREAT STATUS</span>
          <div className="mt-4">
            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${badgeColor}`}>
              {overallState}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-4 leading-relaxed font-sans">{technicalDetail}</p>
        </div>

        {/* Diagnostic parameters depending on the active state */}
        {mode === 'Fire' && (
          <>
            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl text-white">
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">TEMPERATURE READ-OUT</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-400">21.8°C</span>
                <span className="text-xs text-zinc-500">Average Room Index</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-4">12 temperature nodes checked. Maximum differential reading strictly &lt;0.5°C threshold.</p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl text-white">
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">AIR PARTICULATES / CO2</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-400">380 PPM</span>
                <span className="text-xs text-zinc-500">Normal</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-4">Safe background level. Smoke obscuration index: 0.0% / foot density.</p>
            </div>
          </>
        )}

        {mode === 'Secured' && (
          <>
            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl text-white">
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">PORTALS LOCK STATUS</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-400">14 / 14</span>
                <span className="text-xs text-zinc-500">Secured Lockset</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-4">All emergency, main, and interior bypass access panels fully armed and relay locked.</p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl text-white">
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">FACE PASS ACCREDITATION</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-400">99.2%</span>
                <span className="text-xs text-zinc-500">Calibrated Match</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-4">0 unauthorized scans verified today. 2 false parameters flagged down.</p>
            </div>
          </>
        )}

        {mode === 'Monitor' && (
          <>
            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl text-white">
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">NVR STORAGE POOLS</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-amber-500">1.8TB / 2TB</span>
                <span className="text-xs text-zinc-500">Capacity</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-4">87% storage cap. Auto cyclic delete of older motion logs triggered in 1.2 hrs.</p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl text-white">
              <span className="text-[10px] text-zinc-500 font-mono tracking-wider block">BANDWIDTH USAGE RATIO</span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-400">48 Mbps</span>
                <span className="text-xs text-zinc-500">Consolidated load</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-4">Gigabit optical port relay operating at nominal payload limits. No frame droppage.</p>
            </div>
          </>
        )}
      </div>

      {/* Main split: Historical Event Log AND add event simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="status-events-body-split">
        
        {/* Events log list (lg: 8) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4.5 h-4.5 text-[#ef4444]" />
            <h2 className="text-xs font-bold font-mono text-[#ef4444] tracking-wider uppercase">Active Security telemetry log ({filteredEvents.length})</h2>
          </div>

          <div className="bg-zinc-950 border border-zinc-850 rounded-xl max-h-[400px] overflow-y-auto p-4 space-y-2.5 scrollbar-thin">
            {filteredEvents.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono text-center py-8 select-none">No telemetry incidents recorded currently on this stream.</p>
            ) : (
              filteredEvents.slice().reverse().map(evt => {
                let textClass = 'text-zinc-300 border-zinc-850 bg-zinc-900/10';
                let alertLabel = 'DIAG';

                if (evt.type === 'critical') {
                  textClass = 'text-rose-300 border-rose-950/40 bg-rose-950/10';
                  alertLabel = 'CRITICAL ERROR';
                } else if (evt.type === 'warning') {
                  textClass = 'text-amber-300 border-amber-950/40 bg-amber-950/10';
                  alertLabel = 'WARNING FLAG';
                }

                return (
                  <div key={evt.id} className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs font-mono select-text leading-relaxed ${textClass}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[9px] bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">
                          {alertLabel}
                        </span>
                        <span className="text-[10px] text-zinc-500 shrink-0">{evt.timestamp}</span>
                      </div>
                      <p className="text-xs font-sans mt-1 text-zinc-200">{evt.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action Logger Simulator (lg: 4) */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-xs font-bold font-mono text-zinc-400 tracking-wider uppercase">Telemetry injection tool</h2>
          <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl space-y-4">
            <p className="text-xs text-zinc-500 font-sans">Simulate sensor warnings or critical fires to evaluate fail-safes and NVR records:</p>

            <form onSubmit={handleLogEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 font-mono block uppercase">Severity Grade</label>
                <select
                  value={newEventSeverity}
                  onChange={(e) => setNewEventSeverity(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="info">Info / Normal matched scan</option>
                  <option value="warning">Warning / Out-of-bounds scan</option>
                  <option value="critical">Critical / Threat Warning alarms</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 font-mono block uppercase">Interactive Message</label>
                <textarea
                  required
                  rows={3}
                  placeholder={`e.g. Unusual thermal trigger registered on ${mode} portal.`}
                  value={newEventMsg}
                  onChange={(e) => setNewEventMsg(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded p-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-mono text-xs rounded transition flex items-center justify-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" />
                SIMULATE STATE LOG
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
