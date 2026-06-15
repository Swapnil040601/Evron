/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserProfile,
  AttendanceRecord,
  AttendanceTrack,
  LeaveBalance,
  LeaveApplication,
  LeaveType,
  Holiday,
  Shift,
  ShiftAssignment,
  CanteenDailyItem,
  CanteenMonthlyItem,
  CanteenVisit,
  Alert,
  AppSetting,
  FeatureFlags,
  UserRole
} from '../types';

// Connection Controller Configuration Configured by UI settings
export interface ConnectionConfig {
  baseUrl: string;
  useLive: boolean; 
  recaptchaSiteKey: string;
}

// Initial fallback mock data, saved in localStorage so changes are sticky.
const DEFAULT_CONFIG: ConnectionConfig = {
  baseUrl: (import.meta.env.VITE_API_URL as string) || `${typeof window !== 'undefined' ? window.location.origin : ''}/api`,
  useLive: true,
  recaptchaSiteKey: ''
};

// PRELOADED SIMULATOR ACCOUNTS
export const SIMULATOR_ACCOUNTS: { email: string; pass: string; role: UserRole; name: string; avatar: string; code: string }[] = [
  {
    email: 'superadmin@evron.ai',
    pass: 'Super@123',
    role: 'super_admin',
    name: 'Sarah Jenkins',
    avatar: 'avatars/42.jpg',
    code: 'EMP001'
  },
  {
    email: 'admin@evron.ai',
    pass: 'Admin@123',
    role: 'admin',
    name: 'Jane Smith',
    avatar: 'avatars/5.jpg',
    code: 'EMP005'
  },
  {
    email: 'user@evron.ai',
    pass: 'Password@123',
    role: 'user',
    name: 'John Doe',
    avatar: 'avatars/1.jpg',
    code: 'EMP010'
  }
];

class ApiService {
  private config: ConnectionConfig = DEFAULT_CONFIG;
  private token: string | null = null;
  private currentUser: UserProfile | null = null;

  // Simulator In-Memory/Local Storage Db Models (to persist sandbox states seamlessly)
  private users: UserProfile[] = [];
  private attendance: AttendanceRecord[] = [];
  private trackLogs: AttendanceTrack[] = [];
  private leaves: LeaveApplication[] = [];
  private leaveBalances: LeaveBalance[] = [];
  private leaveTypes: LeaveType[] = [];
  private holidays: Holiday[] = [];
  private shifts: Shift[] = [];
  private shiftAssignments: ShiftAssignment[] = [];
  private canteenVisits: CanteenVisit[] = [];
  private alerts: Alert[] = [];
  private settings: AppSetting[] = [];

  constructor() {
    this.loadState();
  }

  // Load from local storage or initialize
  private loadState() {
    const storedCfg = localStorage.getItem('evron_conn_cfg');
    if (storedCfg) {
      try { this.config = JSON.parse(storedCfg); } catch { this.config = DEFAULT_CONFIG; }
    } else {
      localStorage.setItem('evron_conn_cfg', JSON.stringify(DEFAULT_CONFIG));
    }

    this.token = localStorage.getItem('evron_jwt_token');

    // Initialize Simulator DB
    this.initSimulatorDb();
  }

  public saveConfig(cfg: Partial<ConnectionConfig>) {
    this.config = { ...this.config, ...cfg };
    localStorage.setItem('evron_conn_cfg', JSON.stringify(this.config));
  }

  public getConfig(): ConnectionConfig {
    return this.config;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('evron_jwt_token', token);
    } else {
      localStorage.removeItem('evron_jwt_token');
    }
  }

  public async getAppConfig() {
    if (this.config.useLive) {
      try {
        const res = await fetch(`${this.config.baseUrl}/app`);
        if (!res.ok) throw new Error('Live config failed');
        return await res.json();
      } catch (err) {
        console.warn('Fallen back to simulated app config:', err);
      }
    }
    return {
      name: "EVRON SUITE",
      tag_line: "Attendance & Security System",
      logo_url: "logo/logo.png",
      recaptcha_site_key: this.config.recaptchaSiteKey
    };
  }

  // URL formatter for file payloads
  public getFileUrl(relativePath: string): string {
    if (this.config.useLive) {
      return `${this.config.baseUrl}/file/${relativePath}`;
    }
    // Return a stylish royalty-free placeholder image for assets
    if (relativePath.includes('avatar')) {
      const parts = relativePath.split('/');
      const numIdx = parseInt(parts[parts.length - 1]) || 42;
      return `https://images.unsplash.com/photo-${1500000000000 + (numIdx * 1000000)}?w=120&auto=format&fit=facearea&facepad=2&q=80`;
    }
    return `https://images.unsplash.com/photo-1540350390157-c74035bba300?w=600&auto=format&fit=crop&q=80`;
  }

  // Login handler
  public async login(email: string, pass: string, recaptchaToken = ''): Promise<{ token: string; user: UserProfile }> {
    if (this.config.useLive) {
      const response = await fetch(`${this.config.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, recaptcha_token: recaptchaToken })
      });
      if (!response.ok) {
        throw new Error('Authentication Rejected. Invalid credentials or reCAPTCHA failure.');
      }
      const data = await response.json();
      this.setToken(data.token);
      
      // Fetch user profile immediately
      const profile = await this.getProfile();
      return { token: data.token, user: profile };
    }

    // SIMULATION LOGIN
    const match = SIMULATOR_ACCOUNTS.find(acc => acc.email.toLowerCase() === email.toLowerCase() && acc.pass === pass);
    if (!match) {
      throw new Error('Authentication Rejected (Simulated): Invalid username or passphrase.');
    }

    const mockToken = `mock-jwt-token-for-${match.role}-${Date.now()}`;
    this.setToken(mockToken);

    // Get matching mock profile
    const profile = this.users.find(u => u.code === match.code) || {
      id: match.role === 'super_admin' ? 1 : match.role === 'admin' ? 5 : 10,
      name: match.name,
      code: match.code,
      email: match.email,
      phone: '9999999999',
      gender: 'Male',
      type: 'Staff',
      department: match.role === 'super_admin' ? 'Management' : match.role === 'admin' ? 'HR' : 'IT',
      role: match.role,
      status: 'Active',
      avatar: match.avatar,
      reporting_manager_id: match.role === 'user' ? 5 : null,
      reporting_manager_name: match.role === 'user' ? 'Jane Smith' : null
    };

    this.currentUser = profile;
    localStorage.setItem('evron_sim_cur_user', JSON.stringify(profile));
    return { token: mockToken, user: profile };
  }

  public logout() {
    this.setToken(null);
    this.currentUser = null;
    localStorage.removeItem('evron_sim_cur_user');
  }

  // Forgot password
  public async forgotPassword(email: string) {
    if (this.config.useLive) {
      await fetch(`${this.config.baseUrl}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    }
    return { message: "If that email is registered you will receive a reset link." };
  }

  // Reset password
  public async resetPassword(token: string, newPass: string) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPass })
      });
      if (!res.ok) throw new Error('Reset password token expired or invalid password rules.');
      return await res.json();
    }
    return { message: "Password reset complete successfully." };
  }

  // Profile endpoints
  public async getProfile(): Promise<UserProfile> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/me`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to retrieve profile');
      const data = await res.json();
      this.currentUser = data.user;
      return data.user;
    }

    if (!this.currentUser) {
      const fallbackStr = localStorage.getItem('evron_sim_cur_user');
      if (fallbackStr) {
        this.currentUser = JSON.parse(fallbackStr);
      } else {
        // Default as super_admin for convenient live preview
        const defaultAcc = SIMULATOR_ACCOUNTS[0];
        this.currentUser = {
          id: 1,
          name: defaultAcc.name,
          code: defaultAcc.code,
          email: defaultAcc.email,
          phone: "9999999999",
          gender: "Male",
          type: "Staff",
          department: "Management",
          role: defaultAcc.role,
          status: "Active",
          avatar: defaultAcc.avatar,
          reporting_manager_id: null,
          reporting_manager_name: null
        };
      }
    }
    return this.currentUser!;
  }

  public async updateProfile(fields: Partial<UserProfile>): Promise<UserProfile> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/me`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const data = await res.json();
      this.currentUser = data.user;
      return data.user;
    }

    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, ...fields };
      localStorage.setItem('evron_sim_cur_user', JSON.stringify(this.currentUser));
      // Sync on mock users table
      this.users = this.users.map(u => u.id === this.currentUser!.id ? this.currentUser! : u);
      this.saveSimulatorDb();
    }
    return this.currentUser!;
  }

  public async uploadUserAvatar(userId: number, file: File): Promise<string> {
    if (this.config.useLive) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${this.config.baseUrl}/users/${userId}/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Avatar upload error');
      const data = await res.json();
      return data.avatar;
    }
    return `avatars/${userId}.jpg`;
  }

  public async uploadAvatar(file: File): Promise<string> {
    if (this.config.useLive) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${this.config.baseUrl}/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });
      if (!res.ok) throw new Error('Avatar upload error');
      const data = await res.json();
      return data.avatar;
    }

    // Local simulation: convert to string URL or set indexed avatar
    const randAvatar = `avatars/${Math.floor(Math.random() * 50) + 1}.jpg`;
    if (this.currentUser) {
      this.currentUser.avatar = randAvatar;
      localStorage.setItem('evron_sim_cur_user', JSON.stringify(this.currentUser));
      this.users = this.users.map(u => u.id === this.currentUser!.id ? this.currentUser! : u);
      this.saveSimulatorDb();
    }
    return randAvatar;
  }

  public async changePassword(oldPass: string, newPass: string) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/auth/change-password`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ old_password: oldPass, new_password: newPass, confirm_password: newPass })
      });
      if (!res.ok) throw new Error('Current password verification failed or invalid new password specs.');
      return await res.json();
    }
    return { status: 'success', message: 'Credentials updated successfully' };
  }

  // LEAVE ENDPOINTS
  public async getMyLeaves(): Promise<{ rows: LeaveApplication[]; total: number }> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/leave/my`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to retrieve leave records');
      return await res.json();
    }
    // Sandbox
    const userRoleProfile = await this.getProfile();
    const rows = this.leaves.filter(r => r.user_id === userRoleProfile.id || r.user_name === userRoleProfile.name);
    return { rows, total: rows.length };
  }

  public async applyLeave(fields: { leave_type_id: number; from_date: string; to_date: string; no_of_days: number; reason: string; is_lop: boolean }) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/leave/my`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ ...fields, user_submission: true })
      });
      if (!res.ok) throw new Error('Failed submit leave request.');
      return await res.json();
    }

    // Sandbox
    const userRoleProfile = await this.getProfile();
    const mockId = Math.floor(Math.random() * 900000) + 100000;
    const typeObj = this.leaveTypes.find(t => t.id === fields.leave_type_id) || { name: 'Casual Leave' };

    const newApplication: LeaveApplication = {
      id: mockId,
      leave_type_id: fields.leave_type_id,
      leave_type_name: typeObj.name,
      from_date: fields.from_date,
      to_date: fields.to_date,
      no_of_days: fields.no_of_days,
      reason: fields.reason,
      is_lop: fields.is_lop,
      status: 'Pending',
      created_at: new Date().toISOString(),
      user_id: userRoleProfile.id,
      user_name: userRoleProfile.name,
      department: userRoleProfile.department
    };

    this.leaves.unshift(newApplication);

    // Update balances
    this.leaveBalances = this.leaveBalances.map(bal => {
      if (bal.leave_type_id === fields.leave_type_id) {
        return {
          ...bal,
          used: bal.used + fields.no_of_days,
          remaining: Math.max(0, bal.allocated - (bal.used + fields.no_of_days))
        };
      }
      return bal;
    });

    this.saveSimulatorDb();
    return newApplication;
  }

  public async withdrawLeave(id: number) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/leave/applications/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Authorized withdraw only permitted for Pending status.');
      return { success: true };
    }

    // Simulator
    this.leaves = this.leaves.filter(l => l.id !== id);
    this.saveSimulatorDb();
    return { success: true };
  }

  public async getLeaveTypes(): Promise<LeaveType[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/leave/types`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to load types');
      return await res.json();
    }
    return this.leaveTypes;
  }

  public async getLeaveBalances(): Promise<LeaveBalance[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/leave/balances?year=2026`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to load leave ledger.');
      return await res.json();
    }
    return this.leaveBalances;
  }

  public async getReporteesLeaves(status?: string): Promise<LeaveApplication[]> {
    if (this.config.useLive) {
      const query = status ? `?status=${status}` : '';
      const res = await fetch(`${this.config.baseUrl}/leave/reportees${query}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed loading reports hierarchy applications.');
      return await res.json();
    }

    if (status) {
      return this.leaves.filter(l => l.status === status);
    }
    return this.leaves;
  }

  public async updateLeaveStatus(id: number, status: 'Approved' | 'Rejected') {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/leave/applications/${id}/approve`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Approval decision post rejection.');
      return await res.json();
    }

    this.leaves = this.leaves.map(l => {
      if (l.id === id) {
        return { ...l, status };
      }
      return l;
    });
    this.saveSimulatorDb();
    return { success: true };
  }

  // ATTENDANCE ENDPOINTS
  public async getAttendanceList(params: {
    from: string;
    to: string;
    user_id: number | null;
    status: string | null;
    search: string;
    page: number;
    limit: number;
  }): Promise<{ rows: AttendanceRecord[]; total: number }> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/attendance/data`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params)
      });
      if (!res.ok) throw new Error('Error retrieving logs index.');
      return await res.json();
    }

    // Sandbox query logic
    let temp = [...this.attendance];

    // date filter
    if (params.from) {
      temp = temp.filter(a => a.date >= params.from);
    }
    if (params.to) {
      temp = temp.filter(a => a.date <= params.to);
    }
    if (params.user_id) {
      temp = temp.filter(a => a.user_id === params.user_id);
    }
    if (params.status) {
      temp = temp.filter(a => a.status === params.status);
    }
    if (params.search) {
      const query = params.search.toLowerCase();
      temp = temp.filter(a => a.user_name.toLowerCase().includes(query));
    }

    const total = temp.length;
    const startOffset = (params.page - 1) * params.limit;
    const rows = temp.slice(startOffset, startOffset + params.limit);

    return { rows, total };
  }

  public async getMonthlyAttendance(params: { year: number; month: number; user_id: number | null }): Promise<AttendanceRecord[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/attendance/monthly`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params)
      });
      if (!res.ok) throw new Error('Failed to load calendar index.');
      return await res.json();
    }

    const matchUser = params.user_id;
    return this.attendance.filter(a => {
      const dateParts = a.date.split('-');
      const y = parseInt(dateParts[0]);
      const m = parseInt(dateParts[1]);
      if (y !== params.year || m !== params.month) return false;
      if (matchUser && a.user_id !== matchUser) return false;
      return true;
    });
  }

  public async getSingleAttendance(id: number): Promise<AttendanceRecord> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/attendance/${id}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Unregistered attendance session block');
      return await res.json();
    }
    const match = this.attendance.find(a => a.id === id);
    if (!match) throw new Error('Session not found');
    return match;
  }

  public async updateAttendance(id: number, fields: { status: 'Present' | 'Absent' | 'On Leave' | 'Holiday'; remarks: string }) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/attendance/update/${id}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Incident update failed.');
      return await res.json();
    }

    this.attendance = this.attendance.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: fields.status,
          check_in: fields.status === 'Present' ? (a.check_in || '09:00') : null,
          check_out: fields.status === 'Present' ? (a.check_out || '18:00') : null,
          productive_hours: fields.status === 'Present' ? 8.0 : 0
        };
      }
      return a;
    });
    this.saveSimulatorDb();
    return { success: true };
  }

  public async getTracksForAttendance(id: number): Promise<AttendanceTrack[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/attendance/${id}/tracks`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('No tracks found for id');
      return await res.json();
    }
    return this.trackLogs;
  }

  // HOLIDAYS ENDPOINTS
  public async getHolidays(year = 2026): Promise<Holiday[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/holidays?year=${year}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Error loading holidays calendar schedule.');
      return await res.json();
    }
    return this.holidays;
  }

  public async createHoliday(fields: Omit<Holiday, 'id'>): Promise<Holiday> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/holidays`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Holiday setup failed');
      return await res.json();
    }

    const mockId = Math.floor(Math.random() * 900000) + 100000;
    const newHoliday = { id: mockId, ...fields };
    this.holidays.push(newHoliday);
    this.saveSimulatorDb();
    return newHoliday;
  }

  public async updateHoliday(id: number, fields: Partial<Holiday>): Promise<Holiday> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/holidays/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Editing catalog item error.');
      return await res.json();
    }

    this.holidays = this.holidays.map(h => h.id === id ? { ...h, ...fields } : h);
    this.saveSimulatorDb();
    return this.holidays.find(h => h.id === id)!;
  }

  public async deleteHoliday(id: number) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/holidays/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Error wiping ledger parameter.');
      return { success: true };
    }

    this.holidays = this.holidays.filter(h => h.id !== id);
    this.saveSimulatorDb();
    return { success: true };
  }

  // SHIFTS ENDPOINTS
  public async getShifts(): Promise<Shift[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/shifts`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed loading organizational shifts list.');
      return await res.json();
    }
    return this.shifts;
  }

  public async createShift(fields: { name: string; start_time: string; end_time: string }): Promise<Shift> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/shifts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Failed creating roster shift');
      return await res.json();
    }

    const mockId = Math.floor(Math.random() * 900) + 100;
    const newShift: Shift = {
      id: mockId,
      name: fields.name,
      start_time: fields.start_time,
      end_time: fields.end_time,
      staff_count: 0,
      staff: []
    };
    this.shifts.push(newShift);
    this.saveSimulatorDb();
    return newShift;
  }

  public async assignShiftUser(fields: { user_id: number; shift_id: number; from_date: string; to_date: string | null }) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/shifts/assign`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Error assigning staff resource block');
      return await res.json();
    }

    const mockAssignmentId = Math.floor(Math.random() * 900) + 100;
    const newAssign: ShiftAssignment = {
      id: mockAssignmentId,
      user_id: fields.user_id,
      shift_id: fields.shift_id,
      from_date: fields.from_date,
      to_date: fields.to_date
    };
    this.shiftAssignments.push(newAssign);

    // Sync counts
    this.shifts = this.shifts.map(s => {
      if (s.id === fields.shift_id) {
        const staffArr = s.staff || [];
        if (!staffArr.includes(fields.user_id)) {
          const updatedStaff = [...staffArr, fields.user_id];
          return { ...s, staff: updatedStaff, staff_count: updatedStaff.length };
        }
      }
      return s;
    });

    this.saveSimulatorDb();
    return newAssign;
  }

  public async getShiftsForUser(userId: number): Promise<ShiftAssignment[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/shifts/user/${userId}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('User has no assigned roster shift profiles.');
      return await res.json();
    }
    return this.shiftAssignments.filter(a => a.user_id === userId);
  }

  public async deleteShiftAssignment(assignmentId: number) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/shifts/assignment/${assignmentId}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('SLA delete permission rejected.');
      return { success: true };
    }

    const assign = this.shiftAssignments.find(a => a.id === assignmentId);
    if (assign) {
      this.shifts = this.shifts.map(s => {
        if (s.id === assign.shift_id) {
          const filtered = (s.staff || []).filter(u => u !== assign.user_id);
          return { ...s, staff: filtered, staff_count: filtered.length };
        }
        return s;
      });
    }

    this.shiftAssignments = this.shiftAssignments.filter(a => a.id !== assignmentId);
    this.saveSimulatorDb();
    return { success: true };
  }

  // CANTEEN ENDPOINTS
  public async getCanteenDailySummary(date: string): Promise<CanteenDailyItem[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/canteen/daily-summary`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ date })
      });
      if (!res.ok) throw new Error('Error processing ledger summary.');
      return await res.json();
    }

    // compile stats
    const todayVisits = this.canteenVisits.filter(v => v.date === date);
    const types = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
    return types.map(t => {
      const list = todayVisits.filter(v => v.meal_type === t);
      const sum = list.reduce((accum, v) => accum + v.cost, 0);
      return {
        mealType: t,
        servingsCount: list.length,
        billingAmount: sum
      };
    });
  }

  public async getCanteenMonthlyReport(year: number, month: number): Promise<CanteenMonthlyItem[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/canteen/monthly-report`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ year, month })
      });
      if (!res.ok) throw new Error('Canteen report generation error');
      return await res.json();
    }

    // compile summary grouped by user
    const formattedPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const targetVisits = this.canteenVisits.filter(v => v.date.startsWith(formattedPrefix));
    
    const userGroups: { [key: number]: CanteenMonthlyItem } = {};
    for (const v of targetVisits) {
      const userObj = this.users.find(u => u.name === v.user_name);
      const code = userObj?.code || 'EMP999';
      if (!userGroups[v.user_id]) {
        userGroups[v.user_id] = {
          user_name: v.user_name,
          employee_code: code,
          total_meals: 0,
          amount: 0
        };
      }
      userGroups[v.user_id].total_meals += 1;
      userGroups[v.user_id].amount += v.cost;
    }

    return Object.values(userGroups);
  }

  public async getCanteenPersonReport(userId: number, from: string, to: string): Promise<CanteenVisit[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/canteen/person-report`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ user_id: userId, from, to })
      });
      if (!res.ok) throw new Error('Unable to compile report');
      return await res.json();
    }

    return this.canteenVisits.filter(v => v.user_id === userId && v.date >= from && v.date <= to);
  }

  public async getCanteenMealReport(from: string, to: string): Promise<CanteenVisit[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/canteen/meal-report?from=${from}&to=${to}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to retrieve full logs');
      return await res.json();
    }
    return this.canteenVisits.filter(v => v.date >= from && v.date <= to);
  }

  // ALERTS ENDPOINTS
  public async getAlerts(page = 1, limit = 20): Promise<Alert[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/alerts?page=${page}&limit=${limit}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Error sync logs timeline');
      return await res.json();
    }
    return this.alerts;
  }

  public async getUnreadAlertsCount(): Promise<number> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/alerts/unread-count`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Error tracking triggers');
      const data = await res.json();
      return data.count;
    }
    return this.alerts.filter(a => !a.read).length;
  }

  public async markAlertRead(id: number) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/alerts/${id}/read`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Unable write state metric');
      return { success: true };
    }

    this.alerts = this.alerts.map(a => a.id === id ? { ...a, read: true } : a);
    this.saveSimulatorDb();
    return { success: true };
  }

  public async markAllAlertsRead() {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/alerts/read-all`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Wipe active logs triggers error');
      return { success: true };
    }

    this.alerts = this.alerts.map(a => ({ ...a, read: true }));
    this.saveSimulatorDb();
    return { success: true };
  }

  public async addSimulatorAlert(message: string, type: 'critical' | 'warning' | 'info'): Promise<boolean> {
    if (this.config.useLive) {
      try {
        await fetch(`${this.config.baseUrl}/alerts`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ message, type, read: false })
        });
      } catch (e) {
        console.warn('Silent live alert post fallback.');
      }
    }
    const newId = this.alerts.length > 0 ? Math.max(...this.alerts.map(a => a.id)) + 1 : 1;
    const dateFormatted = new Date().toISOString().replace('T', ' ').substring(0, 16);
    this.alerts = [
      { id: newId, message, timestamp: dateFormatted, read: false, type },
      ...this.alerts
    ];
    this.saveSimulatorDb();
    return true;
  }

  // DASHBOARD ENDPOINTS
  public async getDashboardData(date: string) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/dashboard/data`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ date })
      });
      if (!res.ok) throw new Error('Main board dataset offline error.');
      return await res.json();
    }

    // compile simulation stats
    const todayLogs = this.attendance.filter(a => a.date === date);
    const presentCount = todayLogs.filter(a => a.status === 'Present').length;
    const absentCount = todayLogs.filter(a => a.status === 'Absent').length;

    const usersMetric = this.users.map(u => {
      const attendSession = todayLogs.find(a => a.user_id === u.id);
      return {
        id: u.id,
        name: u.name,
        status: attendSession?.status || 'Absent',
        productive_hours: attendSession?.productive_hours || 0,
        non_productive_hours: attendSession?.status === 'Present' ? 1.2 : 0
      };
    });

    return {
      summary: {
        totalEmployees: this.users.length,
        present: presentCount || this.users.length - 2, // realistic preloaded ratio
        absent: absentCount || 2
      },
      users: usersMetric
    };
  }

  // Settings
  public async getSettings(): Promise<{ rows: AppSetting[]; grouped: { [key: string]: AppSetting[] } }> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/settings`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Unassigned roles setting permission');
      return await res.json();
    }

    const grouped: { [key: string]: AppSetting[] } = {
      'Company': [],
      'Features': [],
      'Email': [],
      'AI Config': []
    };
    for (const s of this.settings) {
      grouped[s.group].push(s);
    }
    return { rows: this.settings, grouped };
  }

  public async getFeatureFlags(): Promise<FeatureFlags> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/settings/feature-flags`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to load profile parameters.');
      return await res.json();
    }
    
    // local simulation helper
    const fireDet = this.settings.find(s => s.key === 'enable_fire_detection')?.value === 'true';
    const securedArea = this.settings.find(s => s.key === 'enable_secured_area')?.value === 'true';
    const canteen = this.settings.find(s => s.key === 'enable_canteen')?.value === 'true';

    return {
      enable_fire_detection: fireDet,
      enable_secured_area: securedArea,
      enable_canteen: canteen
    };
  }

  // USERS MANAGEMENT
  public async getUsersList(params: {
    page: number;
    limit: number;
    search: string;
    department: string;
    status: string;
    type: string;
  }): Promise<{ rows: UserProfile[]; total: number }> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/users/data`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params)
      });
      if (!res.ok) throw new Error('Failed loading records database');
      return await res.json();
    }

    let temp = [...this.users];
    if (params.search) {
      const q = params.search.toLowerCase();
      temp = temp.filter(u => u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (params.department) {
      temp = temp.filter(u => u.department === params.department);
    }
    if (params.status) {
      temp = temp.filter(u => u.status === params.status);
    }
    if (params.type) {
      temp = temp.filter(u => u.type === params.type);
    }

    const total = temp.length;
    const offset = (params.page - 1) * params.limit;
    return {
      rows: temp.slice(offset, offset + params.limit),
      total
    };
  }

  public async getUser(id: number): Promise<UserProfile> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/users/${id}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Unregistered member');
      return await res.json();
    }
    const match = this.users.find(u => u.id === id);
    if (!match) throw new Error('Record not found');
    return match;
  }

  public async createUser(fields: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/users`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Conflict or schema payload validation failure.');
      return await res.json();
    }

    const exists = this.users.find(u => u.code && u.code.toLowerCase().trim() === (fields.code || '').toLowerCase().trim());
    if (exists) {
      return exists;
    }

    const mockId = Math.floor(Math.random() * 90) + 10;
    const newUser = { id: mockId, ...fields };
    this.users.push(newUser);
    this.saveSimulatorDb();
    return newUser;
  }

  public async updateUser(id: number, fields: Partial<UserProfile>): Promise<UserProfile> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/users/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Update action invalid.');
      return await res.json();
    }

    this.users = this.users.map(u => u.id === id ? { ...u, ...fields } : u);
    this.saveSimulatorDb();
    return this.users.find(u => u.id === id)!;
  }

  public async deleteUser(id: number) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/users/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Secure delete rejected.');
      return { success: true };
    }

    // Set Status inactive
    this.users = this.users.map(u => u.id === id ? { ...u, status: 'Inactive' } : u);
    this.saveSimulatorDb();
    return { success: true };
  }

  public async restoreUser(id: number) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/users/${id}/restore`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Restore record state error.');
      return await res.json();
    }

    this.users = this.users.map(u => u.id === id ? { ...u, status: 'Active' } : u);
    this.saveSimulatorDb();
    return { success: true };
  }

  // --- NVR & DYNAMIC CAMERA CHANNELS CONNECTIONS ---
  public async getNvrs(): Promise<any[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/nvrs`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed to retrieve NVR configurations.');
      return await res.json();
    }
    const cached = localStorage.getItem('evron_nvrs');
    return cached ? JSON.parse(cached) : [
      { id: 'nvr-01', name: 'NVR-Primary-01', ip: '192.168.1.50', brand: 'Evron Core NVR', port: 80, username: 'admin', status: 'Online' }
    ];
  }

  public async saveNvr(fields: { name: string; ip: string; brand: string; port: number; username: string; password?: string }) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/nvrs`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Failed registering NVR.');
      return await res.json();
    }
    const list = await this.getNvrs();
    const newNvr = {
      id: 'nvr-' + Date.now(),
      status: 'Online',
      ...fields
    };
    list.push(newNvr);
    localStorage.setItem('evron_nvrs', JSON.stringify(list));
    return newNvr;
  }

  public async deleteNvr(id: string) {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/nvrs/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Failed removing NVR connection.');
      return { success: true };
    }
    const list = await this.getNvrs();
    const filtered = list.filter(n => n.id !== id);
    localStorage.setItem('evron_nvrs', JSON.stringify(filtered));
    
    // Auto purge imported cameras from this NVR
    const cams = await this.getImportedCameras();
    const filteredCams = cams.filter(c => !c.id.startsWith(id));
    localStorage.setItem('evron_imported_cameras', JSON.stringify(filteredCams));
    return { success: true };
  }

  public async discoverNvrCameras(nvrId: string): Promise<any[]> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/nvr/${nvrId}/discover`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error('Unassigned NVR connection or scan timeout.');
      return await res.json();
    }

    const nvrs = await this.getNvrs();
    const curr = nvrs.find(n => n.id === nvrId) || { brand: 'ONVIF Protocol', ip: '192.168.1.100' };
    const label = curr.brand || 'ONVIF';
    const prefix = curr.ip || '192.168.1.100';

    return [
      { id: `${nvrId}-ch1`, name: `[${label}] Channel 01 - Lobby Face Scanner`, location: 'Entrance Vestibule Sector A', resolution: '4K UHD', fps: 30, noiseLevel: 'Low', feedColor: 'from-blue-900/40 text-blue-400', status: 'LIVE', sourceNvrIp: prefix },
      { id: `${nvrId}-ch2`, name: `[${label}] Channel 02 - Precious Bounding Desk`, location: '5x5ft Precious Area B', resolution: '1080p HD', fps: 25, noiseLevel: 'Medium', feedColor: 'from-red-950/40 text-red-100', status: 'LIVE', sourceNvrIp: prefix },
      { id: `${nvrId}-ch3`, name: `[${label}] Channel 03 - Server Vault Main Corridor`, location: 'IT Sector Room Vault', resolution: '2K QHD', fps: 30, noiseLevel: 'Low', feedColor: 'from-emerald-900/40 text-emerald-400', status: 'LIVE', sourceNvrIp: prefix },
      { id: `${nvrId}-ch4`, name: `[${label}] Channel 04 - Shuttle Lock Port Exterior`, location: 'Exterior Transit Port Gate', resolution: '1080p HD', fps: 15, noiseLevel: 'High', feedColor: 'from-purple-900/40 text-purple-400', status: 'REC', sourceNvrIp: prefix }
    ];
  }

  public async addDirectCamera(fields: { name: string; rtspUrl: string; location: string }): Promise<any> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/cameras/direct`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(fields)
      });
      if (!res.ok) throw new Error('Failed to add direct camera.');
      return await res.json();
    }
    const cam = {
      id: 'direct-' + Date.now(),
      name: fields.name,
      rtsp_url: fields.rtspUrl,
      location: fields.location,
      status: 'LIVE',
      alertFlag: false,
      resolution: 'Live RTSP',
      fps: 25,
      feedColor: 'from-blue-900/40 text-blue-400',
    };
    const current = await this.getImportedCameras();
    current.push(cam);
    localStorage.setItem('evron_imported_cameras', JSON.stringify(current));
    return cam;
  }

  public async importCameras(cameras: any[]): Promise<boolean> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/cameras/import`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ cameras })
      });
      if (!res.ok) throw new Error('Bulk camera import failed.');
      return true;
    }
    const current = await this.getImportedCameras();
    const updated = [...current];
    cameras.forEach(cam => {
      if (!updated.some(u => u.id === cam.id)) {
        updated.push({
          ...cam,
          status: cam.status || 'LIVE',
          alertFlag: false
        });
      }
    });
    localStorage.setItem('evron_imported_cameras', JSON.stringify(updated));
    return true;
  }

  public async getImportedCameras(): Promise<any[]> {
    try {
      const res = await fetch(`${this.config.baseUrl}/nvr/cameras`, {
        headers: this.getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const feedColors = [
          'from-blue-900/40 text-blue-400',
          'from-emerald-900/40 text-emerald-400',
          'from-purple-900/40 text-purple-400',
          'from-red-950/40 text-red-400',
          'from-orange-900/40 text-orange-400',
          'from-cyan-900/40 text-cyan-400',
          'from-indigo-900/40 text-indigo-400',
          'from-teal-900/40 text-teal-400',
          'from-zinc-900/50 text-zinc-400',
        ];
        return (data.data || []).map((cam: any, idx: number) => ({
          id: String(cam.id),
          name: cam.name,
          location: `${cam.nvr_name} · Ch.${cam.channel}`,
          status: 'LIVE',
          alertFlag: false,
          feedColor: feedColors[idx % feedColors.length],
          brand: cam.brand,
          channel: cam.channel,
          nvr_id: cam.nvr_id,
          nvr_name: cam.nvr_name,
        }));
      }
    } catch (e) {
      console.warn('Failed to fetch cameras from backend:', e);
    }
    const cached = localStorage.getItem('evron_imported_cameras');
    return cached ? JSON.parse(cached) : [];
  }

  public async deleteImportedCamera(id: string): Promise<boolean> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/cameras/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      return res.ok;
    }
    const current = await this.getImportedCameras();
    const updated = current.filter(c => c.id !== id);
    localStorage.setItem('evron_imported_cameras', JSON.stringify(updated));
    return true;
  }

  public async simulateAlertCustomCamera(id: string, alertFlag: boolean, alertMsg?: string): Promise<boolean> {
    if (this.config.useLive) {
      const res = await fetch(`${this.config.baseUrl}/cameras/${id}/alert`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ alertFlag, alertMsg })
      });
      return res.ok;
    }
    const current = await this.getImportedCameras();
    const updated = current.map(c => {
      if (c.id === id) {
        return { ...c, alertFlag, alertMsg: alertFlag ? alertMsg : undefined };
      }
      return c;
    });
    localStorage.setItem('evron_imported_cameras', JSON.stringify(updated));
    return true;
  }

  // UTILS
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.token ? `Bearer ${this.token}` : ''
    };
  }

  // Create seed databases inside the client sandbox
  private initSimulatorDb() {
    // 1. Users
    const cachedUsers = localStorage.getItem('evron_sim_users');
    if (cachedUsers) {
      try { 
        const parsed: UserProfile[] = JSON.parse(cachedUsers);
        const seenCodes = new Set<string>();
        const cleanUsers: UserProfile[] = [];
        parsed.forEach(u => {
          const codeKey = (u.code || '').toLowerCase().trim();
          if (codeKey) {
            if (!seenCodes.has(codeKey)) {
              seenCodes.add(codeKey);
              cleanUsers.push(u);
            }
          } else {
            cleanUsers.push(u);
          }
        });
        this.users = cleanUsers;
        localStorage.setItem('evron_sim_users', JSON.stringify(cleanUsers));
      } catch { 
        this.users = []; 
      }
    }
    if (!this.users || this.users.length === 0) {
      this.users = [
        {
          id: 1,
          name: 'Sarah Jenkins',
          code: 'EMP001',
          email: 'superadmin@evron.ai',
          phone: '+1 (555) 019-2834',
          gender: 'Female',
          type: 'Staff',
          department: 'Engineering',
          role: 'super_admin',
          status: 'Active',
          avatar: 'avatars/42.jpg',
          reporting_manager_id: null,
          reporting_manager_name: null
        },
        {
          id: 5,
          name: 'Jane Smith',
          code: 'EMP005',
          email: 'admin@evron.ai',
          phone: '+1 (555) 019-6123',
          gender: 'Female',
          type: 'Staff',
          department: 'HR',
          role: 'admin',
          status: 'Active',
          avatar: 'avatars/5.jpg',
          reporting_manager_id: 1,
          reporting_manager_name: 'Sarah Jenkins'
        },
        {
          id: 10,
          name: 'John Doe',
          code: 'EMP010',
          email: 'user@evron.ai',
          phone: '9999999999',
          gender: 'Male',
          type: 'Staff',
          department: 'IT',
          role: 'user',
          status: 'Active',
          avatar: 'avatars/1.jpg',
          reporting_manager_id: 5,
          reporting_manager_name: 'Jane Smith'
        },
        {
          id: 11,
          name: 'Michael Chen',
          code: 'EMP002',
          email: 'michael.c@company.com',
          phone: '+1 (555) 019-8831',
          gender: 'Male',
          type: 'Staff',
          department: 'Design',
          role: 'user',
          status: 'Active',
          avatar: 'avatars/2.jpg',
          reporting_manager_id: 5,
          reporting_manager_name: 'Jane Smith'
        }
      ];
    }

    // 2. Attendance
    const today = '2026-05-24';
    const cachedAttend = localStorage.getItem('evron_sim_attendance');
    if (cachedAttend) {
      try { this.attendance = JSON.parse(cachedAttend); } catch { this.attendance = []; }
    }
    if (!this.attendance || this.attendance.length === 0) {
      this.attendance = [
        { id: 1, user_id: 1, user_name: 'Sarah Jenkins', date: today, status: 'Present', check_in: '08:45', check_out: '18:00', productive_hours: 9.25 },
        { id: 2, user_id: 11, user_name: 'Michael Chen', date: today, status: 'Present', check_in: '09:32', check_out: '18:00', productive_hours: 8.46 },
        { id: 3, user_id: 5, user_name: 'Jane Smith', date: today, status: 'On Leave', check_in: null, check_out: null, productive_hours: 0 },
        { id: 4, user_id: 10, user_name: 'John Doe', date: today, status: 'Present', check_in: '09:00', check_out: '18:00', productive_hours: 8.0 }
      ];
    }

    // 3. Track Logs
    this.trackLogs = [
      { id: 1, timestamp: '2026-05-24 09:00 AM', camera_name: 'Main Gate Block A', type: 'In', accuracy: 99.2 },
      { id: 2, timestamp: '2026-05-24 10:15 AM', camera_name: 'Block A Cafeteria Entry', type: 'Through', accuracy: 98.4 },
      { id: 3, timestamp: '2026-05-24 01:20 PM', camera_name: 'IT Server Vault Bypass', type: 'Through', accuracy: 96.8 }
    ];

    // 4. Leave Types
    this.leaveTypes = [
      { id: 1, name: 'Sick Leave', description: 'Paid medical leave with certified certificate', is_paid: true },
      { id: 2, name: 'Casual Leave', description: 'Urgent personal work allocations', is_paid: true },
      { id: 3, name: 'Annual Privilege Leave', description: 'Scheduled annual holiday break leaves', is_paid: true },
      { id: 4, name: 'Loss of Pay (LOP)', description: 'Unpaid leaves bypass allowances', is_paid: false }
    ];

    // 5. Leave Balances
    const cachedBalances = localStorage.getItem('evron_sim_leave_balances');
    if (cachedBalances) {
      try { this.leaveBalances = JSON.parse(cachedBalances); } catch { this.leaveBalances = []; }
    }
    if (!this.leaveBalances || this.leaveBalances.length === 0) {
      this.leaveBalances = [
        { leave_type_id: 1, leave_type_name: 'Sick Leave', allocated: 8, used: 2, remaining: 6, is_paid: true },
        { leave_type_id: 2, leave_type_name: 'Casual Leave', allocated: 12, used: 2, remaining: 10, is_paid: true },
        { leave_type_id: 3, leave_type_name: 'Annual Privilege Leave', allocated: 18, used: 4, remaining: 14, is_paid: true },
        { leave_type_id: 4, leave_type_name: 'Loss Of Pay (LOP)', allocated: 30, used: 0, remaining: 30, is_paid: false }
      ];
    }

    // 6. Leaves
    const cachedLeaves = localStorage.getItem('evron_sim_leaves');
    if (cachedLeaves) {
      try { this.leaves = JSON.parse(cachedLeaves); } catch { this.leaves = []; }
    }
    if (!this.leaves || this.leaves.length === 0) {
      this.leaves = [
        {
          id: 1,
          leave_type_id: 2,
          leave_type_name: 'Casual Leave',
          from_date: '2026-06-01',
          to_date: '2026-06-02',
          no_of_days: 2,
          reason: 'Personal family emergency work requirement',
          is_lop: false,
          status: 'Pending',
          created_at: '2026-05-24T12:00:00.000Z',
          user_id: 10,
          user_name: 'John Doe',
          department: 'IT'
        },
        {
          id: 2,
          leave_type_id: 1,
          leave_type_name: 'Sick Leave',
          from_date: '2026-05-24',
          to_date: '2026-05-24',
          no_of_days: 1,
          reason: 'Doctor certified high medical fever resting',
          is_lop: false,
          status: 'Approved',
          created_at: '2026-05-23T08:00:00.000Z',
          user_id: 5,
          user_name: 'Jane Smith',
          department: 'HR'
        }
      ];
    }

    // 7. Holidays
    const cachedHolidays = localStorage.getItem('evron_sim_holidays');
    if (cachedHolidays) {
      try { this.holidays = JSON.parse(cachedHolidays); } catch { this.holidays = []; }
    }
    if (!this.holidays || this.holidays.length === 0) {
      this.holidays = [
        { id: 1, date: '2026-01-01', name: 'New Year Day celebration', type: 'National', description: 'Universal annual setup' },
        { id: 2, date: '2026-08-15', name: 'Independence Day', type: 'National', description: 'National flag hoisting and parades' },
        { id: 3, date: '2026-12-25', name: 'Christmas', type: 'Regional', description: 'Religious holiday event' }
      ];
    }

    // 8. Shifts
    const cachedShifts = localStorage.getItem('evron_sim_shifts');
    if (cachedShifts) {
      try { this.shifts = JSON.parse(cachedShifts); } catch { this.shifts = []; }
    }
    if (!this.shifts || this.shifts.length === 0) {
      this.shifts = [
        { id: 1, name: 'General/Day Shift', start_time: '09:00', end_time: '18:05', staff_count: 3, staff: [1, 5, 10] },
        { id: 2, name: 'Night Critical Patrol', start_time: '21:00', end_time: '06:00', staff_count: 1, staff: [11] }
      ];
    }

    // 9. Shift Assignments
    const cachedShiftAssignments = localStorage.getItem('evron_sim_shift_assignments');
    if (cachedShiftAssignments) {
      try { this.shiftAssignments = JSON.parse(cachedShiftAssignments); } catch { this.shiftAssignments = []; }
    }
    if (!this.shiftAssignments || this.shiftAssignments.length === 0) {
      this.shiftAssignments = [
        { id: 1, user_id: 1, shift_id: 1, from_date: '2026-05-01', to_date: null },
        { id: 2, user_id: 5, shift_id: 1, from_date: '2026-05-01', to_date: null },
        { id: 3, user_id: 10, shift_id: 1, from_date: '2026-05-15', to_date: null },
        { id: 4, user_id: 11, shift_id: 2, from_date: '2026-05-01', to_date: null }
      ];
    }

    // 10. Canteen Visits
    const cachedCanteen = localStorage.getItem('evron_sim_canteen');
    if (cachedCanteen) {
      try { this.canteenVisits = JSON.parse(cachedCanteen); } catch { this.canteenVisits = []; }
    }
    if (!this.canteenVisits || this.canteenVisits.length === 0) {
      this.canteenVisits = [
        { id: 1, user_id: 1, user_name: 'Sarah Jenkins', date: today, time: '09:12 AM', meal_type: 'Breakfast', cost: 12 },
        { id: 2, user_id: 10, user_name: 'John Doe', date: today, time: '01:30 PM', meal_type: 'Lunch', cost: 35 },
        { id: 3, user_id: 11, user_name: 'Michael Chen', date: today, time: '05:45 PM', meal_type: 'Snacks', cost: 8 },
        { id: 4, user_id: 1, user_name: 'Sarah Jenkins', date: today, time: '02:00 PM', meal_type: 'Lunch', cost: 35 }
      ];
    }

    // 11. Alerts
    const cachedAlerts = localStorage.getItem('evron_sim_alerts');
    if (cachedAlerts) {
      try { this.alerts = JSON.parse(cachedAlerts); } catch { this.alerts = []; }
    }
    if (!this.alerts || this.alerts.length === 0) {
      this.alerts = [
        { id: 1, message: 'Intrusion alert in Server Room: perimeter bypassed on Cam-03', timestamp: '2026-05-24 09:15 AM', read: false, type: 'critical' },
        { id: 2, message: 'Extreme thermal trigger near Block B boiler sector', timestamp: '2026-05-24 10:45 AM', read: false, type: 'warning' },
        { id: 3, message: 'Auto daily surveillance database sync successfully matching SLA parameters', timestamp: '2026-05-24 12:00 PM', read: true, type: 'info' }
      ];
    }

    // 12. Settings Setup
    const cachedSettings = localStorage.getItem('evron_sim_settings');
    if (cachedSettings) {
      try { this.settings = JSON.parse(cachedSettings); } catch { this.settings = []; }
    }
    if (!this.settings || this.settings.length === 0) {
      this.settings = [
        { key: 'app_name', label: 'App Identification Brand', type: 'text', value: 'EVRON SUITE', group: 'Company' },
        { key: 'company_domain', label: 'Surveillance Hub domain', type: 'text', value: 'evron.corp.ai', group: 'Company' },
        { key: 'enable_fire_detection', label: 'Live Boiler Room thermal scan alarms', type: 'boolean', value: 'true', group: 'Features' },
        { key: 'enable_secured_area', label: 'Server Room high security lock toggle', type: 'boolean', value: 'true', group: 'Features' },
        { key: 'enable_canteen', label: 'Smart Cafeteria dynamic biometrics billing', type: 'boolean', value: 'true', group: 'Features' },
        { key: 'smtp_host', label: 'HR alerts dispatch mail relay host', type: 'text', value: 'smtp.evron.ai', group: 'Email' },
        { key: 'gemini_model_profile', label: 'Selected Face Embeddings verification LLM', type: 'text', value: 'gemini-2.5-flash-camera-v2', group: 'AI Config' }
      ];
    }

    this.saveSimulatorDb();
  }

  // Save state helpers to standard localStorage
  private saveSimulatorDb() {
    localStorage.setItem('evron_sim_users', JSON.stringify(this.users));
    localStorage.setItem('evron_sim_attendance', JSON.stringify(this.attendance));
    localStorage.setItem('evron_sim_leaves', JSON.stringify(this.leaves));
    localStorage.setItem('evron_sim_leave_balances', JSON.stringify(this.leaveBalances));
    localStorage.setItem('evron_sim_holidays', JSON.stringify(this.holidays));
    localStorage.setItem('evron_sim_shifts', JSON.stringify(this.shifts));
    localStorage.setItem('evron_sim_shift_assignments', JSON.stringify(this.shiftAssignments));
    localStorage.setItem('evron_sim_canteen', JSON.stringify(this.canteenVisits));
    localStorage.setItem('evron_sim_alerts', JSON.stringify(this.alerts));
    localStorage.setItem('evron_sim_settings', JSON.stringify(this.settings));
  }

}

export const apiService = new ApiService();
