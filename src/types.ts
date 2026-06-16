/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface UserProfile {
  id: number;
  name: string;
  code: string;
  email: string;
  phone: string;
  gender: string;
  type: string;
  department: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  avatar: string;
  reporting_manager_id: number | null;
  reporting_manager_name: string | null;
}

export const FACE_POSES = ['straight', 'left', 'right', 'up', 'down', 'smile'] as const;
export type FacePose = typeof FACE_POSES[number];

export const POSE_LABELS: Record<FacePose, string> = {
  straight: 'Look Straight',
  left:     'Turn Left',
  right:    'Turn Right',
  up:       'Look Up',
  down:     'Look Down',
  smile:    'Smile',
};

export const POSE_ICONS: Record<FacePose, string> = {
  straight: '👁',
  left:     '←',
  right:    '→',
  up:       '↑',
  down:     '↓',
  smile:    '☺',
};

export interface Employee {
  id: number;
  name: string;
  code: string;
  email: string;
  phone: string;
  gender: string;
  department: string;
  type: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  avatar: string;
  registered_pose_count: number;
  poses: FacePose[];
  pose_images: Record<string, string>;
  face_registered: boolean;
  face_status: 'complete' | 'partial' | 'pending';
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_code: string;
  department: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Holiday';
  check_in: string | null;
  check_out: string | null;
  productive_hours: number;
  camera_hours: number;
  phone_usage_pct: number;
  remarks: string | null;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  on_leave: number;
}
