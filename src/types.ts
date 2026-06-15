/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User and Profile Roles
export type UserRole = 'super_admin' | 'admin' | 'user';

export interface UserProfile {
  id: number;
  name: string;
  code: string; // e.g. "EMP001"
  email: string;
  phone: string;
  gender: string; // "Male" | "Female" | "Other"
  type: string; // "Staff" etc.
  department: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  avatar: string; // e.g., "avatars/1.jpg"
  reporting_manager_id: number | null;
  reporting_manager_name: string | null;
  password?: string;
}

// Attendance List Entry
export interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'On Leave' | 'Holiday';
  check_in: string | null; // HH:MM
  check_out: string | null; // HH:MM
  productive_hours: number;
}

// Attendance Track Log
export interface AttendanceTrack {
  id: number;
  timestamp: string;
  camera_name: string;
  type: 'In' | 'Out' | 'Through';
  accuracy: number;
}

// Leave Balances
export interface LeaveBalance {
  leave_type_id: number;
  leave_type_name: string;
  allocated: number;
  used: number;
  remaining: number;
  is_paid: boolean;
}

// Leave Application
export interface LeaveApplication {
  id: number;
  leave_type_id: number;
  leave_type_name: string;
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
  no_of_days: number;
  reason: string;
  is_lop: boolean;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  user_id?: number;
  user_name?: string;
  department?: string;
}

export interface LeaveType {
  id: number;
  name: string;
  description: string;
  is_paid: boolean;
}

// Holidays Structure - Dual compatibility
export interface Holiday {
  id: number | string;
  date: string; // YYYY-MM-DD
  name: string;
  day?: string;
  type: 'National' | 'Regional' | 'Optional' | 'Restricted' | 'Gazetted';
  description?: string; // Made optional for legacy support
}

// Shifts Structure - Dual compatibility
export interface Shift {
  id: number | string;
  name: string;
  type?: string;
  timeRange?: string;
  gracePeriod?: string;
  assignedStaffCount?: number;
  start_time?: string;
  end_time?: string;
  staff_count?: number;
  staff?: any[]; // list of user ids assigned
}

export interface ShiftAssignment {
  id: number;
  user_id: number;
  shift_id: number;
  from_date: string;
  to_date: string | null;
}

// Canteen Structure
export interface CanteenDailyItem {
  mealType: string;
  servingsCount: number;
  billingAmount: number;
}

export interface CanteenMonthlyItem {
  user_name: string;
  employee_code: string;
  total_meals: number;
  amount: number;
}

// CanteenVisit - Dual compatibility properties
export interface CanteenVisit {
  id: number | string;
  user_id?: number;
  user_name?: string;
  employeeName?: string;
  department?: string;
  item?: string;
  date?: string; // Optional for legacy support
  time: string;
  mealType?: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'; // Compatibility Alias
  meal_type?: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'; // Optional for legacy support
  cost?: number; // Optional for legacy support
}

// Alerts Structure
export interface Alert {
  id: number;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'critical' | 'warning' | 'info';
}

// Settings Structures
export interface AppSetting {
  key: string;
  label: string;
  type: 'text' | 'boolean' | 'number' | 'select';
  value: string;
  group: 'Company' | 'Features' | 'Email' | 'AI Config';
}

export interface FeatureFlags {
  enable_fire_detection: boolean;
  enable_secured_area: boolean;
  enable_canteen: boolean;
}

// LEGACY ALIASES FOR GRAPH_VIS AND STATE INTERFACE STABILITY across Dashboard, Users, LiveView, Attendance views
export type EmployeeStatus = 'Present' | 'Absent' | 'Late' | 'On Leave';

export interface Employee {
  id: string;
  name: string;
  avatar: string;
  role: string;
  department: string;
  email: string;
  status: EmployeeStatus;
  checkInTime?: string;
  checkOutTime?: string;
  attendanceRate: number;
  phone: string;
}

export interface ActivityLog {
  id: string;
  type: 'check_in' | 'check_out' | 'break' | 'alert' | 'system';
  employeeId?: string;
  employeeName?: string;
  role?: string;
  department?: string;
  detail?: string;
  time: string;
  cameraName?: string;
  duration?: string;
  status?: 'critical' | 'warning' | 'info';
}

export interface LeaveRequest {
  id: string;
  employeeName: string;
  department: string;
  role: string;
  leaveType: 'Sick' | 'Casual' | 'Annual' | 'LOP';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'LIVE' | 'REC' | 'OFFLINE';
  alertFlag: boolean;
  alertMsg?: string;
  resolution?: string;
  fps?: number;
  noiseLevel?: string;
  feedColor: string;
}

export interface SecurityEvent {
  id: string;
  source: 'Fire' | 'Secured' | 'Monitor';
  type: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}
