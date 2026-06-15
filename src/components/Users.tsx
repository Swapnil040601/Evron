/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Employee, EmployeeStatus } from '../types';
import { Search, UserPlus, ShieldAlert, ArrowLeft, Mail, Phone, Award, CheckCircle2, Camera, Upload } from 'lucide-react';
import { showAlert } from '../utils/dialog';

interface UsersProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
}

export default function Users({ employees, onAddEmployee }: UsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Engineering');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpStatus, setNewEmpStatus] = useState<EmployeeStatus>('Present');
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter employees
  const filteredUsers = employees.filter(emp => {
    return emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
           emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
           emp.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpRole || !newEmpEmail) {
      showAlert('Please fill out Name, Role and Email fields.', 'warning');
      return;
    }

    // Auto calculate random values
    const newId = `EMP00${employees.length + 1}`;
    const randomAvatars = [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
    ];
    const pickedAvatar = randomAvatars[employees.length % randomAvatars.length];

    const newEmp: Employee = {
      id: newId,
      name: newEmpName,
      avatar: pickedAvatar,
      role: newEmpRole,
      department: newEmpDept,
      email: newEmpEmail,
      status: newEmpStatus,
      attendanceRate: 95,
      phone: newEmpPhone || '+1 (555) 019-0000',
      faceStatus: facePhoto ? 'pending' : 'none',
      checkInTime: newEmpStatus === 'Present' ? '09:00 AM' : undefined
    };

    onAddEmployee(newEmp);

    if (facePhoto) {
      const queue: any[] = JSON.parse(localStorage.getItem('evron_face_queue') || '[]');
      queue.push({
        empId: newId,
        empName: newEmpName,
        fileName: facePhoto.name,
        submittedAt: new Date().toISOString(),
        status: 'pending'
      });
      localStorage.setItem('evron_face_queue', JSON.stringify(queue));
    }

    // Reset Form
    setNewEmpName('');
    setNewEmpRole('');
    setNewEmpEmail('');
    setNewEmpPhone('');
    setNewEmpStatus('Present');
    setFacePhoto(null);
    setFacePhotoPreview(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6" id="personnel-database-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Active Staff Directory</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Biometric credentials validation & core profiles</p>
        </div>

        {/* Dynamic add switch */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold font-mono transition shadow-lg"
            id="add-staff-trigger"
          >
            <UserPlus className="w-4 h-4" />
            REGISTER NEW EMPLOYEE
          </button>
        ) : (
          <button
            onClick={() => setShowAddForm(false)}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white rounded-lg text-xs font-mono transition"
            id="register-cancel-back"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO LIST
          </button>
        )}
      </div>

      {showAddForm ? (
        /* REGISTER NEW EMPLOYEE FORM BLOCK */
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 max-w-2xl mx-auto space-y-6" id="add-employee-form-block">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-white tracking-tight uppercase font-mono text-[#ef4444]">Employee Registration</h2>
            <p className="text-xs text-zinc-500 mt-1">Provide full name and corporate email. Optionally upload a face photo — admin will review and approve it.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Anderson"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Job Role Designation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Systems Engineer"
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-855 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Department Assign</label>
                <select
                  value={newEmpDept}
                  onChange={(e) => setNewEmpDept(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Operations">Operations</option>
                  <option value="Design">Design</option>
                  <option value="Security">Security</option>
                  <option value="HR">HR</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Enrollment Status</label>
                <select
                  value={newEmpStatus}
                  onChange={(e) => setNewEmpStatus(e.target.value as EmployeeStatus)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Present">Present (Checked-in)</option>
                  <option value="Absent">Absent (Not scanned)</option>
                  <option value="Late">Late (Scan missed window)</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. liam.a@company.com"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Emergency Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +1 (555) 019-9944"
                  value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Face Photo Upload */}
            <div className="space-y-2 border-t border-zinc-800 pt-4">
              <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Face Photo (Optional — Pending Admin Approval)</label>
              <div
                className="border border-dashed border-zinc-700 rounded-lg p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-600 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                {facePhotoPreview ? (
                  <img src={facePhotoPreview} alt="preview" className="w-20 h-20 object-cover rounded-full border border-zinc-700" />
                ) : (
                  <>
                    <Camera className="w-6 h-6 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500 font-mono">Click to upload face photo</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFacePhoto(file);
                      setFacePhotoPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
              {facePhoto && (
                <p className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Photo queued for admin approval after submission
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold font-mono text-xs rounded-lg transition shadow-lg"
              >
                REGISTER & SUBMIT
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* SEARCHABLE LIST VIEW */
        <div className="space-y-4" id="users-directory-list">
          {/* Search bar control */}
          <div className="relative bg-zinc-900/40 border border-zinc-800/80 p-3 rounded-xl max-w-md">
            <Search className="absolute left-6 top-5.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter names, roles or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600 font-mono"
            />
          </div>

          {/* User grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="personnel-bento-grid">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-zinc-900/10 border border-zinc-800 rounded-xl space-y-1">
                <ShieldAlert className="w-8 h-8 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-semibold text-zinc-200">No personnel records found</h4>
                <p className="text-xs text-zinc-500 font-mono select-none">Refine keyword or register a new subject profile above.</p>
              </div>
            ) : (
              filteredUsers.map((emp, idx) => {
                let ratingColor = 'text-emerald-400';
                if (emp.attendanceRate < 90) { ratingColor = 'text-rose-400'; }
                else if (emp.attendanceRate < 94) { ratingColor = 'text-amber-400'; }

                return (
                  <div
                    key={`${emp.id}-${idx}`}
                    className="bg-zinc-900/40 border border-zinc-805 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition relative shadow"
                  >
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-1.5 mb-3.5">
                      <span className="text-[9px] bg-zinc-950 font-semibold font-mono text-zinc-500 border border-zinc-850 px-2 py-0.5 rounded uppercase">
                        {emp.id}
                      </span>
                    </div>

                    {/* Bio */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded-full border border-zinc-800"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate leading-tight uppercase font-mono tracking-tight">{emp.name}</h4>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-sans italic">{emp.role}</p>
                        <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 mt-1 inline-block font-mono uppercase">
                          {emp.department}
                        </span>
                      </div>
                    </div>

                    {/* Meta contacts */}
                    <div className="border-t border-zinc-800/80 pt-3 space-y-2 text-[10px] text-zinc-400 font-mono">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{emp.phone}</span>
                      </div>
                      
                      {/* Roster Rate tracking */}
                      <div className="flex items-center justify-between border-t border-zinc-800/40 pt-1.5 mt-1.5 text-[9px]">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Award className="w-3 h-3 text-zinc-600" /> Compliance rating:
                        </span>
                        <strong className={`${ratingColor} font-bold font-mono`}>{emp.attendanceRate}%</strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
