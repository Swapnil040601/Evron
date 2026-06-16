/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Users, Plus, X, Check, Loader2, AlertTriangle, UserCheck, Lock } from 'lucide-react';
import { apiService } from '../services/api';
import { UserProfile, Shift, UserWithShift } from '../types';

interface ShiftsProps {
  currentUser: UserProfile;
}

const SHIFT_COLORS = [
  'border-l-emerald-500',
  'border-l-blue-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-purple-500',
  'border-l-teal-500',
];

function fmtTime(t: string | null | undefined): string {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hNum = parseInt(h, 10);
  return `${hNum % 12 || 12}:${m} ${hNum < 12 ? 'AM' : 'PM'}`;
}

export default function Shifts({ currentUser }: ShiftsProps) {
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [usersWithShifts, setUsersWithShifts] = useState<UserWithShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'err'; msg: string } | null>(null);

  // Create shift form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('18:00');
  const [newGrace, setNewGrace] = useState(10);

  // Assign shift modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignUserId, setAssignUserId] = useState<number | ''>('');
  const [assignShiftId, setAssignShiftId] = useState<number | ''>('');
  const [assignFromDate, setAssignFromDate] = useState(new Date().toISOString().slice(0, 10));

  const notify = (type: 'success' | 'err', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftsData, usersData] = await Promise.all([
        apiService.getShifts(),
        apiService.getUsersWithShifts(),
      ]);
      setShifts(shiftsData);
      setUsersWithShifts(usersData);
    } catch {
      notify('err', 'Failed to load shift roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openAssignModal = (presetShiftId?: number, presetUserId?: number) => {
    setAssignShiftId(presetShiftId ?? (shifts[0]?.id ? Number(shifts[0].id) : ''));
    setAssignUserId(presetUserId ?? '');
    setAssignFromDate(new Date().toISOString().slice(0, 10));
    setShowAssignModal(true);
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await apiService.createShift({ name: newName.trim(), start_time: newStart, end_time: newEnd, grace_minutes: newGrace });
      setShowCreateForm(false);
      setNewName('');
      setNewStart('09:00');
      setNewEnd('18:00');
      setNewGrace(10);
      await loadData();
      notify('success', `Shift "${newName.trim()}" created successfully.`);
    } catch (err: any) {
      notify('err', err.message || 'Failed to create shift.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserId || !assignShiftId) return;
    setSaving(true);
    try {
      await apiService.assignShiftUser({
        user_id: Number(assignUserId),
        shift_id: Number(assignShiftId),
        from_date: assignFromDate,
        to_date: null,
      });
      setShowAssignModal(false);
      await loadData();
      notify('success', 'Shift assigned successfully.');
    } catch (err: any) {
      notify('err', err.message || 'Failed to assign shift.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: number, userName: string) => {
    if (!window.confirm(`Remove ${userName}'s shift assignment?`)) return;
    try {
      await apiService.deleteShiftAssignment(assignmentId);
      await loadData();
      notify('success', 'Assignment removed.');
    } catch {
      notify('err', 'Failed to remove assignment.');
    }
  };

  return (
    <div className="space-y-6" id="shifts-manager-screen">

      {/* Notification banner */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl text-sm font-mono shadow-2xl border animate-fadeIn max-w-sm text-center ${
          notification.type === 'success'
            ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
            : 'bg-rose-950 border-rose-800 text-rose-300'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Company Shifts & Rosters</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Configure attendance windows and grace thresholds per shift</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isSuperAdmin ? (
            <>
              <button
                onClick={() => openAssignModal()}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-mono font-bold rounded-xl transition"
              >
                <UserCheck className="w-3.5 h-3.5" />
                ASSIGN SHIFT
              </button>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" />
                NEW SHIFT
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-500">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              View only — shift management requires Super Admin
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-zinc-500 font-mono text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading shift roster...
        </div>
      )}

      {!loading && (
        <>
          {/* Shift Cards */}
          {shifts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-xl">
              No shifts configured.{isSuperAdmin ? ' Click "NEW SHIFT" to create one.' : ''}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="shifts-cards-grid">
              {shifts.map((shift, idx) => {
                const color = SHIFT_COLORS[idx % SHIFT_COLORS.length];
                const assignedCount = usersWithShifts.filter(
                  u => u.shift_id != null && Number(u.shift_id) === Number(shift.id)
                ).length;
                return (
                  <div
                    key={shift.id}
                    className={`bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition flex flex-col justify-between border-l-4 ${color}`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] text-zinc-400 font-mono tracking-wider font-semibold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          SHF-{String(shift.id).padStart(2, '0')}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white tracking-tight">{shift.name}</h3>
                      <div className="grid grid-cols-2 gap-4 mt-5 mb-2 text-xs font-mono">
                        <div className="bg-zinc-950/40 border border-zinc-800 p-2 rounded-lg flex flex-col gap-1">
                          <span className="text-[9px] text-zinc-500">SHIFT WINDOW</span>
                          <span className="text-white flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            {fmtTime(shift.start_time)} – {fmtTime(shift.end_time)}
                          </span>
                        </div>
                        <div className="bg-zinc-950/40 border border-zinc-800 p-2 rounded-lg flex flex-col gap-1">
                          <span className="text-[9px] text-zinc-500">GRACE THRESHOLD</span>
                          <span className="text-zinc-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-500" />
                            {shift.grace_minutes ?? 10} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-zinc-800/60 pt-3 mt-4 flex items-center justify-between text-xs text-zinc-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        Staff assigned: <strong className="text-white ml-1">{assignedCount}</strong>
                      </span>
                      {isSuperAdmin && (
                        <button
                          onClick={() => openAssignModal(Number(shift.id))}
                          className="text-[10px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-3 py-1 rounded-md transition"
                        >
                          ASSIGN STAFF
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Staff shift assignments table */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Staff Shift Assignments</h3>
              <span className="text-[10px] font-mono text-zinc-500">{usersWithShifts.length} employees</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800/60 text-zinc-500 text-[9px] uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Employee</th>
                    <th className="text-left px-4 py-2.5">Department</th>
                    <th className="text-left px-4 py-2.5">Shift</th>
                    <th className="text-left px-4 py-2.5">Window</th>
                    <th className="text-left px-4 py-2.5">Grace</th>
                    <th className="text-left px-4 py-2.5">From</th>
                    {isSuperAdmin && <th className="px-4 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {usersWithShifts.length === 0 && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="text-center py-8 text-zinc-600">No employees found.</td>
                    </tr>
                  )}
                  {usersWithShifts.map(u => (
                    <tr key={u.user_id} className="hover:bg-zinc-900/40 transition">
                      <td className="px-4 py-2.5">
                        <div className="font-bold text-white">{u.user_name}</div>
                        <div className="text-[9px] text-zinc-500">{u.code}</div>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-400">{u.department || '—'}</td>
                      <td className="px-4 py-2.5">
                        {u.shift_name ? (
                          <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 rounded text-[10px]">
                            {u.shift_name}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-[10px]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-300">
                        {u.start_time ? `${fmtTime(u.start_time)} – ${fmtTime(u.end_time)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-400">
                        {u.grace_minutes != null ? `${u.grace_minutes}m` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-400">{u.from_date || '—'}</td>
                      {isSuperAdmin && (
                        <td className="px-4 py-2.5 text-right">
                          {u.assignment_id ? (
                            <button
                              onClick={() => handleRemoveAssignment(u.assignment_id!, u.user_name)}
                              className="text-[9px] text-rose-500 hover:text-rose-400 border border-rose-900/30 hover:border-rose-700/60 px-2 py-0.5 rounded transition"
                            >
                              REMOVE
                            </button>
                          ) : (
                            <button
                              onClick={() => openAssignModal(undefined, u.user_id)}
                              className="text-[9px] text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-2 py-0.5 rounded transition"
                            >
                              ASSIGN
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warning footer */}
          <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
              WARNING: Modifying active shift windows causes recalculation of today's Present/Late status. Employees already checked in will NOT be back-adjusted.
              Only Super Admin can create and assign shifts. All changes are audit-logged.
            </p>
          </div>
        </>
      )}

      {/* Create Shift Modal */}
      {showCreateForm && isSuperAdmin && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowCreateForm(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Create New Shift</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-zinc-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateShift} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-1">Shift Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Morning Shift"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={e => setNewStart(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-1">End Time *</label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={e => setNewEnd(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-1">Grace Period (minutes) *</label>
                <input
                  type="number"
                  value={newGrace}
                  onChange={e => setNewGrace(Math.max(0, parseInt(e.target.value) || 0))}
                  min={0}
                  max={120}
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition"
                />
                <p className="text-[9px] text-zinc-600 mt-1 font-mono">Minutes of late arrival allowed before marking as Late</p>
              </div>
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {saving ? 'CREATING...' : 'CREATE SHIFT'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Shift Modal */}
      {showAssignModal && isSuperAdmin && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Assign Shift to Employee</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-zinc-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            {shifts.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono py-4 text-center">No shifts available. Create a shift first.</p>
            ) : (
              <form onSubmit={handleAssignShift} className="space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-1">Employee *</label>
                  <select
                    value={assignUserId}
                    onChange={e => setAssignUserId(parseInt(e.target.value) || '')}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition"
                  >
                    <option value="">Select employee...</option>
                    {usersWithShifts.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.user_name} ({u.code}){u.shift_name ? ` — ${u.shift_name}` : ' — unassigned'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-1">Shift *</label>
                  <select
                    value={assignShiftId}
                    onChange={e => setAssignShiftId(parseInt(e.target.value) || '')}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition"
                  >
                    <option value="">Select shift...</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({fmtTime(s.start_time)} – {fmtTime(s.end_time)}, {s.grace_minutes ?? 10}m grace)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block mb-1">Effective From *</label>
                  <input
                    type="date"
                    value={assignFromDate}
                    onChange={e => setAssignFromDate(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-600 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving || !assignUserId || !assignShiftId}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {saving ? 'ASSIGNING...' : 'ASSIGN SHIFT'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
