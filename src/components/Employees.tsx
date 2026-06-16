/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UserPlus, Search, RefreshCw, Camera, CheckCircle, XCircle,
  ChevronLeft, Trash2, User, RotateCcw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Employee, FacePose, FACE_POSES, POSE_LABELS, POSE_ICONS } from '../types';
import { apiService } from '../services/api';

type Screen = 'list' | 'add' | 'face-capture' | 'profile';

const DEPT_OPTIONS = [
  'Engineering', 'Operations', 'Administration', 'HR', 'Finance',
  'Security', 'Maintenance', 'Sales', 'IT', 'Management',
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

export default function Employees() {
  const [screen, setScreen] = useState<Screen>('list');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [error, setError] = useState('');

  // New employee form
  const [form, setForm] = useState({
    name: '', code: '', email: '', phone: '',
    gender: 'Male', department: 'Engineering',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<Employee | null>(null);

  // Face capture state
  const [captureTarget, setCaptureTarget] = useState<Employee | null>(null);
  const [capturedImages, setCapturedImages] = useState<Partial<Record<FacePose, string>>>({});
  const [activePoseIdx, setActivePoseIdx] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiService.getEmployees({ search, limit: 100 });
      setEmployees(res.rows);
      setSummary(res.summary ?? {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      setFormError('Name and Employee Code are required.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const emp = await apiService.createEmployee(form);
      setNewlyCreated(emp as Employee);
      setForm({ name: '', code: '', email: '', phone: '', gender: 'Male', department: 'Engineering' });
      startFaceCapture(emp as Employee, true);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const startFaceCapture = (emp: Employee, fromNew = false) => {
    setCaptureTarget(emp);
    setCapturedImages({});
    setActivePoseIdx(0);
    setSubmitResult(null);
    if (!fromNew) setNewlyCreated(null);
    setScreen('face-capture');
  };

  const capturePhoto = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const photo = await CapCamera.getPhoto({
        quality: 85,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
        allowEditing: false,
        presentationStyle: 'fullscreen',
      });
      if (!photo.base64String) throw new Error('No image data');
      const dataUrl = `data:image/jpeg;base64,${photo.base64String}`;
      const pose = FACE_POSES[activePoseIdx];
      setCapturedImages(prev => ({ ...prev, [pose]: dataUrl }));
      // Auto-advance to next uncaptured pose
      const nextIdx = FACE_POSES.findIndex((p, i) => i > activePoseIdx && !capturedImages[p]);
      if (nextIdx !== -1) setActivePoseIdx(nextIdx);
    } catch (e: any) {
      if (!e.message?.includes('cancelled')) {
        alert(`Camera error: ${e.message}`);
      }
    } finally {
      setCapturing(false);
    }
  };

  const retakePose = (pose: FacePose) => {
    setCapturedImages(prev => {
      const next = { ...prev };
      delete next[pose];
      return next;
    });
    setActivePoseIdx(FACE_POSES.indexOf(pose));
  };

  const submitFaces = async () => {
    if (!captureTarget) return;
    const poses = FACE_POSES.filter(p => capturedImages[p]);
    if (poses.length === 0) { alert('Take at least one photo.'); return; }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const images = poses.map(p => capturedImages[p]!);
      const res = await apiService.registerFace(captureTarget.id, poses, images);
      setSubmitResult({ success: true, message: `${res.saved ?? poses.length} pose(s) registered successfully.` });
      loadEmployees();
    } catch (e: any) {
      setSubmitResult({ success: false, message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const deletePose = async (emp: Employee, pose: FacePose) => {
    if (!confirm(`Delete ${POSE_LABELS[pose]} pose for ${emp.name}?`)) return;
    try {
      await apiService.deletePose(emp.id, pose);
      loadEmployees();
      if (selectedEmp?.id === emp.id) {
        const updated = employees.find(e => e.id === emp.id);
        if (updated) setSelectedEmp({ ...updated, poses: updated.poses.filter(p => p !== pose) });
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = employees.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.code.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (screen === 'face-capture' && captureTarget) {
    const capturedCount = FACE_POSES.filter(p => capturedImages[p]).length;
    const allDone = capturedCount === FACE_POSES.length;

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setScreen(newlyCreated ? 'list' : 'profile'); loadEmployees(); }}
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-zinc-500 font-mono">Face Registration</p>
            <h2 className="text-sm font-bold text-white">{captureTarget.name}</h2>
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-1 rounded-full">
            {capturedCount}/{FACE_POSES.length}
          </span>
        </div>

        {submitResult ? (
          /* Result screen */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
            {submitResult.success
              ? <CheckCircle2 className="w-16 h-16 text-emerald-400" />
              : <AlertCircle className="w-16 h-16 text-red-400" />}
            <div>
              <p className={`text-lg font-bold ${submitResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {submitResult.success ? 'Registration Complete!' : 'Registration Failed'}
              </p>
              <p className="text-sm text-zinc-400 mt-1">{submitResult.message}</p>
            </div>
            <button
              onClick={() => { setScreen('list'); loadEmployees(); }}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition"
            >
              Done
            </button>
            {!submitResult.success && (
              <button onClick={() => setSubmitResult(null)}
                className="px-6 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm">
                Retry
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Pose selector pills */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {FACE_POSES.map((pose, idx) => {
                const done = !!capturedImages[pose];
                const active = idx === activePoseIdx;
                return (
                  <button
                    key={pose}
                    onClick={() => setActivePoseIdx(idx)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border text-xs font-mono transition ${
                      done
                        ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-400'
                        : active
                        ? 'bg-red-600/20 border-red-500 text-red-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <span className="text-lg">{POSE_ICONS[pose]}</span>
                    <span className="text-[9px] uppercase">{pose}</span>
                    {done && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Active pose preview / capture area */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-6">
              {(() => {
                const pose = FACE_POSES[activePoseIdx];
                const img = capturedImages[pose];
                return (
                  <div className="w-full max-w-xs space-y-4">
                    {/* Instruction */}
                    <div className="text-center">
                      <span className="text-4xl">{POSE_ICONS[pose]}</span>
                      <h3 className="text-white font-bold text-lg mt-1">{POSE_LABELS[pose]}</h3>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {img ? 'Photo captured. Retake or move to next pose.' : 'Position your face and capture.'}
                      </p>
                    </div>

                    {/* Photo preview */}
                    {img ? (
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-emerald-600/50">
                        <img src={img} alt={pose} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2 bg-emerald-600 rounded-full p-1">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center gap-3">
                        <Camera className="w-12 h-12 text-zinc-600" />
                        <p className="text-zinc-600 text-xs font-mono">No photo yet</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      {img ? (
                        <button onClick={() => retakePose(pose)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition">
                          <RotateCcw className="w-4 h-4" /> Retake
                        </button>
                      ) : (
                        <button onClick={capturePhoto} disabled={capturing}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition">
                          <Camera className="w-4 h-4" />
                          {capturing ? 'Opening camera...' : 'Take Photo'}
                        </button>
                      )}
                      {img && activePoseIdx < FACE_POSES.length - 1 && (
                        <button
                          onClick={() => setActivePoseIdx(i => i + 1)}
                          className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-sm font-medium transition"
                        >
                          Next Pose →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Submit bar */}
            <div className="px-4 py-4 border-t border-zinc-800 bg-zinc-900">
              <button
                onClick={submitFaces}
                disabled={capturedCount === 0 || submitting}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Registering faces...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Register {capturedCount} Photo{capturedCount !== 1 ? 's' : ''}</>
                )}
              </button>
              {!allDone && capturedCount > 0 && (
                <p className="text-center text-xs text-zinc-500 mt-2">
                  {FACE_POSES.length - capturedCount} pose(s) remaining — you can submit now or capture all 6.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === 'profile' && selectedEmp) {
    const emp = employees.find(e => e.id === selectedEmp.id) || selectedEmp;
    const faceColor = emp.face_status === 'complete' ? 'text-emerald-400' : emp.face_status === 'partial' ? 'text-amber-400' : 'text-zinc-500';
    const faceLabel = emp.face_status === 'complete' ? 'Complete (6/6)' : emp.face_status === 'partial' ? `Partial (${emp.registered_pose_count}/6)` : 'Not Registered';

    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setScreen('list')} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-zinc-500 font-mono">Employee Profile</p>
            <h2 className="text-sm font-bold text-white">{emp.name}</h2>
          </div>
          <button
            onClick={() => startFaceCapture(emp)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
          >
            <Camera className="w-3.5 h-3.5" /> Register Face
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Info card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
              {emp.avatar
                ? <img src={apiService.getFileUrl(emp.avatar)} alt={emp.name} className="w-full h-full object-cover" />
                : <User className="w-7 h-7 text-zinc-500" />}
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-white font-bold text-base truncate">{emp.name}</h3>
              <p className="text-xs text-zinc-500 font-mono">{emp.code} · {emp.department}</p>
              <p className="text-xs text-zinc-500">{emp.email}</p>
              {emp.phone && <p className="text-xs text-zinc-500">{emp.phone}</p>}
            </div>
          </div>

          {/* Face status */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Face Registration</h4>
              <span className={`text-xs font-mono font-bold ${faceColor}`}>{faceLabel}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${emp.face_status === 'complete' ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${(emp.registered_pose_count / 6) * 100}%` }}
              />
            </div>

            {/* Pose grid */}
            <div className="grid grid-cols-3 gap-2">
              {FACE_POSES.map(pose => {
                const done = emp.poses.includes(pose);
                const imgPath = emp.pose_images?.[pose];
                return (
                  <div key={pose} className={`relative rounded-xl overflow-hidden border aspect-square ${done ? 'border-emerald-700/50' : 'border-zinc-800'}`}>
                    {done && imgPath ? (
                      <img src={apiService.getFileUrl(imgPath)} alt={pose} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-1">
                        <span className="text-xl">{POSE_ICONS[pose]}</span>
                        <span className="text-[9px] text-zinc-600 font-mono uppercase">{pose}</span>
                      </div>
                    )}
                    {done && (
                      <div className="absolute top-1 right-1 bg-emerald-600 rounded-full p-0.5">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {done && (
                      <button
                        onClick={() => deletePose(emp, pose)}
                        className="absolute bottom-1 right-1 bg-red-900/80 rounded-full p-0.5 opacity-0 hover:opacity-100 transition"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-red-400" />
                      </button>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center">
                      <span className="text-[8px] text-white font-mono uppercase">{pose}</span>
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

  if (screen === 'add') {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setScreen('list')} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-zinc-500 font-mono">Step 1 of 2</p>
            <h2 className="text-sm font-bold text-white">Register Employee</h2>
          </div>
        </div>

        <div className="p-4">
          <form onSubmit={handleCreateEmployee} className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4">
              <h3 className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Personal Information</h3>

              {[
                { label: 'Full Name *', key: 'name', placeholder: 'John Smith', type: 'text' },
                { label: 'Employee Code *', key: 'code', placeholder: 'EMP001', type: 'text' },
                { label: 'Email', key: 'email', placeholder: 'john@company.com', type: 'email' },
                { label: 'Phone', key: 'phone', placeholder: '+91 9876543210', type: 'tel' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase">Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase">Department</label>
                  <select
                    value={form.department}
                    onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                  >
                    {DEPT_OPTIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-400 font-mono bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-2.5">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
            >
              {formLoading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</>
                : <><Camera className="w-4 h-4" /> Create &amp; Register Face</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Employee List ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-white">Employees</h1>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              {summary.total ?? 0} total · {summary.face_registered ?? 0} face registered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadEmployees} className="p-2 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setScreen('add')}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition"
            >
              <UserPlus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name, code, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500 transition"
          />
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800 border-b border-zinc-800 bg-zinc-900/60">
        {[
          { label: 'Total', value: summary.total ?? 0, color: 'text-white' },
          { label: 'Registered', value: summary.face_registered ?? 0, color: 'text-emerald-400' },
          { label: 'Pending', value: (summary.total ?? 0) - (summary.face_registered ?? 0), color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="py-2.5 text-center">
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-500 font-mono uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="m-4 p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 text-xs font-mono">{error}</div>
        )}
        {loading && !employees.length ? (
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="w-6 h-6 text-zinc-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-2">
            <User className="w-8 h-8" />
            <p className="text-sm">{search ? 'No results found' : 'No employees yet'}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {filtered.map(emp => {
              const faceColor = emp.face_status === 'complete' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                : emp.face_status === 'partial' ? 'text-amber-400 bg-amber-950/30 border-amber-800/30'
                : 'text-zinc-500 bg-zinc-900 border-zinc-800';
              const faceText = emp.face_status === 'complete' ? 'Complete'
                : emp.face_status === 'partial' ? `${emp.registered_pose_count}/6`
                : 'Pending';

              return (
                <button
                  key={emp.id}
                  onClick={() => { setSelectedEmp(emp); setScreen('profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-900/60 transition text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {emp.avatar
                      ? <img src={apiService.getFileUrl(emp.avatar)} alt={emp.name} className="w-full h-full object-cover" />
                      : <User className="w-5 h-5 text-zinc-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{emp.name}</p>
                    <p className="text-[11px] text-zinc-500 font-mono">{emp.code} · {emp.department}</p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-lg border ${faceColor}`}>
                    {faceText}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
