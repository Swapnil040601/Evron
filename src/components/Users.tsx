/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Employee, EmployeeStatus, UserRole } from '../types';
import { Search, UserPlus, ShieldAlert, ArrowLeft, Mail, Phone, Award, Camera, Upload, Eye, EyeOff } from 'lucide-react';
import { showAlert } from '../utils/dialog';
import { apiService } from '../services/api';

interface UsersProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee, facePhoto: File | null, password: string, userRole: UserRole) => void;
}

export default function Users({ employees, onAddEmployee }: UsersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Sales');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpUserRole, setNewEmpUserRole] = useState<UserRole>('user');
  const [newEmpStatus, setNewEmpStatus] = useState<EmployeeStatus>('Present');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpConfirmPassword, setNewEmpConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName || !newEmpRole || !newEmpEmail || !newEmpPassword) {
      showAlert('Please fill out Name, Job Title, Email and Password fields.', 'warning');
      return;
    }
    if (newEmpPassword !== newEmpConfirmPassword) {
      showAlert('Passwords do not match.', 'warning');
      return;
    }
    if (newEmpPassword.length < 6) {
      showAlert('Password must be at least 6 characters.', 'warning');
      return;
    }

    setIsSubmitting(true);
    const newId = `EMP${String(employees.length + 1).padStart(3, '0')}`;

    const newEmp: Employee = {
      id: newId,
      name: newEmpName,
      avatar: facePhotoPreview || '',
      role: newEmpRole,
      department: newEmpDept,
      email: newEmpEmail,
      status: newEmpStatus,
      attendanceRate: 100,
      phone: newEmpPhone || '',
checkInTime: newEmpStatus === 'Present' ? '09:00 AM' : undefined
    };

    await onAddEmployee(newEmp, facePhoto, newEmpPassword, newEmpUserRole);
    setIsSubmitting(false);

    // Reset form
    setNewEmpName(''); setNewEmpRole(''); setNewEmpEmail('');
    setNewEmpPhone(''); setNewEmpPassword(''); setNewEmpConfirmPassword('');
    setNewEmpStatus('Present'); setNewEmpUserRole('user');
    setFacePhoto(null); setFacePhotoPreview(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6" id="personnel-database-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans sm:text-3xl">Staff Directory</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Manage and register employees</p>
        </div>

        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold font-mono transition shadow-lg"
            id="add-staff-trigger"
          >
            <UserPlus className="w-4 h-4" />
            ADD NEW EMPLOYEE
          </button>
        ) : (
          <button
            onClick={() => setShowAddForm(false)}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white rounded-lg text-xs font-mono transition"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO LIST
          </button>
        )}
      </div>

      {showAddForm ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 max-w-2xl mx-auto space-y-6">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-[#ef4444] tracking-tight uppercase font-mono">Register New Employee</h2>
            <p className="text-xs text-zinc-500 mt-1">Fill in the details below. The employee will use their email and password to log in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo upload — prominent at top */}
            <div className="flex items-center gap-5 pb-4 border-b border-zinc-800">
              <div
                className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-600 hover:border-emerald-500 flex items-center justify-center cursor-pointer overflow-hidden shrink-0 transition bg-zinc-950"
                onClick={() => fileInputRef.current?.click()}
              >
                {facePhotoPreview ? (
                  <img src={facePhotoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-zinc-500" />
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
              <div>
                <p className="text-xs font-semibold text-white font-mono">Employee Photo</p>
                <p className="text-[10px] text-zinc-500 mt-1">Tap the circle to upload a front-facing photo.<br />This will be shown on their profile card.</p>
                {facePhoto && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                    <Upload className="w-3 h-3" /> Photo selected
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Full Name *</label>
                <input type="text" required placeholder="e.g. Rahul Sharma" value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Job Title *</label>
                <input type="text" required placeholder="e.g. Sales Executive" value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Department</label>
                <select value={newEmpDept} onChange={(e) => setNewEmpDept(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option>Sales</option>
                  <option>HR</option>
                  <option>Operations</option>
                  <option>Engineering</option>
                  <option>Finance</option>
                  <option>Marketing</option>
                  <option>Security</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">App Role</label>
                <select value={newEmpUserRole} onChange={(e) => setNewEmpUserRole(e.target.value as UserRole)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                  <option value="user">Employee (Regular)</option>
                  <option value="admin">Manager / Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Email *</label>
                <input type="email" required placeholder="e.g. rahul@company.com" value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Phone</label>
                <input type="text" placeholder="e.g. +91 98765 43210" value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>

            {/* Password fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Login Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required placeholder="Min 6 characters" value={newEmpPassword}
                    onChange={(e) => setNewEmpPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 pr-9 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500" />
                  <button type="button" className="absolute right-2.5 top-2.5 text-zinc-500" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-mono font-semibold block uppercase">Confirm Password *</label>
                <input type={showPassword ? 'text' : 'password'} required placeholder="Repeat password" value={newEmpConfirmPassword}
                  onChange={(e) => setNewEmpConfirmPassword(e.target.value)}
                  className={`w-full bg-zinc-950 border rounded-lg p-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 ${newEmpConfirmPassword && newEmpPassword !== newEmpConfirmPassword ? 'border-red-500' : 'border-zinc-850'}`} />
                {newEmpConfirmPassword && newEmpPassword !== newEmpConfirmPassword && (
                  <p className="text-[10px] text-red-400 font-mono">Passwords do not match</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex justify-end">
              <button type="submit" disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold font-mono text-xs rounded-lg transition shadow-lg disabled:opacity-60 flex items-center gap-2">
                {isSubmitting ? 'Registering...' : 'REGISTER EMPLOYEE'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative bg-zinc-900/40 border border-zinc-800/80 p-3 rounded-xl max-w-md">
            <Search className="absolute left-6 top-5.5 h-4 w-4 text-zinc-500" />
            <input type="text" placeholder="Search by name, role or department..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-850 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600 font-mono" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-zinc-900/10 border border-zinc-800 rounded-xl space-y-1">
                <ShieldAlert className="w-8 h-8 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-semibold text-zinc-200">No employees found</h4>
                <p className="text-xs text-zinc-500 font-mono">Try a different search or register a new employee.</p>
              </div>
            ) : (
              filteredUsers.map((emp, idx) => {
                let ratingColor = 'text-emerald-400';
                if (emp.attendanceRate < 90) ratingColor = 'text-rose-400';
                else if (emp.attendanceRate < 94) ratingColor = 'text-amber-400';

                const avatarSrc = emp.avatar && (emp.avatar.startsWith('data:') || emp.avatar.startsWith('http'))
                  ? emp.avatar
                  : apiService.getFileUrl(emp.avatar);

                return (
                  <div key={`${emp.id}-${idx}`}
                    className="bg-zinc-900/40 border border-zinc-805 rounded-xl p-4 flex flex-col justify-between hover:border-zinc-700/80 transition relative shadow">
                    <div className="flex items-center justify-between gap-1.5 mb-3.5">
                      <span className="text-[9px] bg-zinc-950 font-semibold font-mono text-zinc-500 border border-zinc-850 px-2 py-0.5 rounded uppercase">
                        {emp.id}
                      </span>
                    </div>

                    {/* Photo + name side by side */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 rounded-full border border-zinc-700 overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-lg font-bold text-zinc-400">{emp.name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate leading-tight uppercase font-mono tracking-tight">{emp.name}</h4>
                        <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-sans italic">{emp.role}</p>
                        <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 mt-1 inline-block font-mono uppercase">
                          {emp.department}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-3 space-y-2 text-[10px] text-zinc-400 font-mono">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      {emp.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-zinc-800/40 pt-1.5 mt-1.5 text-[9px]">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <Award className="w-3 h-3 text-zinc-600" /> Attendance:
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
