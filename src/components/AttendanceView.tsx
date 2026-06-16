/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Download, RefreshCw, Search, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, AlertCircle, Filter, FileSpreadsheet
} from 'lucide-react';
import { AttendanceRecord } from '../types';
import { apiService } from '../services/api';

type Tab = 'daily' | 'monthly';
type StatusFilter = 'All' | 'Present' | 'Absent' | 'Late' | 'On Leave';

const STATUS_COLORS: Record<string, string> = {
  Present:   'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
  Late:      'bg-amber-950/30 text-amber-400 border-amber-800/30',
  Absent:    'bg-red-950/30 text-red-400 border-red-800/30',
  'On Leave':'bg-blue-950/30 text-blue-400 border-blue-800/30',
  Holiday:   'bg-purple-950/30 text-purple-400 border-purple-800/30',
};

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(t: string | null) {
  if (!t) return '—';
  try { return new Date(`1970-01-01T${t}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
  catch { return t; }
}
function fmtHours(h: number) {
  if (!h) return '—';
  const hrs = Math.floor(h / 3600);
  const mins = Math.floor((h % 3600) / 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export default function AttendanceView() {
  const [tab, setTab] = useState<Tab>('daily');

  // Daily state
  const [date, setDate] = useState(today());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Export date range
  const [exportFrom, setExportFrom] = useState(today());
  const [exportTo, setExportTo] = useState(today());
  const [showExport, setShowExport] = useState(false);

  // Monthly state
  const [monthStr, setMonthStr] = useState(today().slice(0, 7)); // YYYY-MM
  const [monthData, setMonthData] = useState<any>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  const loadDaily = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiService.getAttendance({
        from: date,
        to: date,
        search,
        status: statusFilter === 'All' ? null : statusFilter,
        limit: 300,
      });
      setRecords(res.rows ?? []);
      setSummary(res.summary ?? {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [date, search, statusFilter]);

  useEffect(() => { if (tab === 'daily') loadDaily(); }, [tab, loadDaily]);

  const loadMonthly = useCallback(async () => {
    setMonthLoading(true);
    try {
      const res = await apiService.getMonthlyAttendance(monthStr);
      setMonthData(res);
    } catch {}
    finally { setMonthLoading(false); }
  }, [monthStr]);

  useEffect(() => { if (tab === 'monthly') loadMonthly(); }, [tab, loadMonthly]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await apiService.exportAttendance({ from: exportFrom, to: exportTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${exportFrom}_to_${exportTo}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExport(false);
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const shiftMonth = (months: number) => {
    const [y, m] = monthStr.split('-').map(Number);
    const d = new Date(y, m - 1 + months, 1);
    setMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  // ── Monthly heatmap ──────────────────────────────────────────────────────
  const renderMonthly = () => {
    if (monthLoading) {
      return (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      );
    }
    if (!monthData) return null;

    const employees: any[] = monthData.employees ?? [];
    const daysInMonth: number = monthData.days_in_month ?? 30;
    const dataThroughDay: number = monthData.data_through_day ?? daysInMonth;

    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Employees', value: employees.length, color: 'text-white' },
            { label: 'Avg Present', value: employees.length
                ? Math.round(employees.reduce((s, e) => s + Number(e.present ?? 0), 0) / employees.length) + 'd'
                : '—', color: 'text-emerald-400' },
            { label: 'Days Tracked', value: dataThroughDay, color: 'text-zinc-300' },
            { label: 'Total Days', value: daysInMonth, color: 'text-zinc-500' },
          ].map(c => (
            <div key={c.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
              <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-zinc-500 font-mono uppercase">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Employee monthly table */}
        {employees.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-sm">No data for this month.</div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-5 bg-zinc-950/60 border-b border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase">
              {['Employee', 'Present', 'Absent', 'Leave', 'Offs'].map(h => (
                <div key={h} className="px-3 py-2 text-center">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-zinc-900">
              {employees.map((emp: any, i: number) => (
                <div key={i} className="grid grid-cols-5 items-center text-xs">
                  <div className="px-3 py-2.5 col-span-1">
                    <p className="text-white font-medium truncate text-[11px]">{emp.name}</p>
                    <p className="text-[9px] text-zinc-600 font-mono truncate">{emp.department}</p>
                  </div>
                  <div className="text-center py-2.5 text-emerald-400 font-bold">{emp.present ?? 0}</div>
                  <div className="text-center py-2.5 text-red-400 font-bold">{emp.absent ?? 0}</div>
                  <div className="text-center py-2.5 text-blue-400">{emp.holidays ?? 0}</div>
                  <div className="text-center py-2.5 text-zinc-500">{emp.week_offs ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Daily list ───────────────────────────────────────────────────────────
  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return !q || r.user_name?.toLowerCase().includes(q) || (r.user_code || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-white">Attendance</h1>
          <button
            onClick={() => setShowExport(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export
          </button>
        </div>

        {/* Export panel */}
        {showExport && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-mono text-zinc-400 uppercase">Export date range</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-mono">From</label>
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-mono">To</label>
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
              </div>
            </div>
            <button onClick={handleExport} disabled={exporting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2">
              {exporting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Exporting...</> : <><Download className="w-4 h-4" /> Download CSV</>}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
          {(['daily', 'monthly'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition ${t === tab ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'daily' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Date nav */}
          <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center gap-2">
            <button onClick={() => shiftDate(-1)} className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-red-500" />
            <button onClick={() => shiftDate(1)} disabled={date >= today()}
              className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={loadDaily} className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Summary strip */}
          {summary && (
            <div className="grid grid-cols-4 divide-x divide-zinc-800 border-b border-zinc-800 bg-zinc-900/40">
              {[
                { label: 'Present', value: summary.present ?? 0, color: 'text-emerald-400' },
                { label: 'Late', value: summary.late ?? 0, color: 'text-amber-400' },
                { label: 'Absent', value: summary.absent ?? 0, color: 'text-red-400' },
                { label: 'Leave', value: summary.on_leave ?? 0, color: 'text-blue-400' },
              ].map(s => (
                <div key={s.label} className="py-2 text-center">
                  <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-zinc-600 font-mono uppercase">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Search + filter */}
          <div className="px-4 py-2.5 flex gap-2 border-b border-zinc-800 bg-zinc-900/30">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input type="text" placeholder="Search employee..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-red-500">
              {(['All', 'Present', 'Late', 'Absent', 'On Leave'] as StatusFilter[]).map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Records list */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="m-4 p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-xs font-mono">{error}</div>
            )}
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-5 h-5 text-zinc-600 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-zinc-600 gap-1.5 text-sm">
                <Calendar className="w-7 h-7" />
                <p>No records for {fmtDate(date)}</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {filtered.map(rec => (
                  <div key={rec.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{rec.user_name}</p>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        {rec.user_code || ''}{rec.department ? ` · ${rec.department}` : ''}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 font-mono">
                        {rec.check_in && <span>In: <span className="text-zinc-300">{fmtTime(rec.check_in)}</span></span>}
                        {rec.check_out && <span>Out: <span className="text-zinc-300">{fmtTime(rec.check_out)}</span></span>}
                        {rec.productive_hours > 0 && <span>Work: <span className="text-zinc-300">{fmtHours(rec.productive_hours)}</span></span>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border shrink-0 ${STATUS_COLORS[rec.status] || 'text-zinc-400 bg-zinc-900 border-zinc-800'}`}>
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Monthly tab */
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/60">
            <button onClick={() => shiftMonth(-1)} className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-white">
                {new Date(monthStr + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button onClick={() => shiftMonth(1)} disabled={monthStr >= today().slice(0, 7)}
              className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={loadMonthly} className="p-1.5 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
              <RefreshCw className={`w-4 h-4 ${monthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="p-4">
            {renderMonthly()}
          </div>
        </div>
      )}
    </div>
  );
}
