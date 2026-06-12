/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, ActivityLog, LeaveRequest, Camera, CanteenVisit, Shift, Holiday, SecurityEvent } from './types';

export const initialEmployees: Employee[] = [
  {
    id: 'EMP001',
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    role: 'Lead AI Engineer',
    department: 'Engineering',
    email: 'sarah.j@company.com',
    status: 'Present',
    checkInTime: '08:45 AM',
    attendanceRate: 98,
    phone: '+1 (555) 019-2834',
    faceMatchedId: 'FACE-9921'
  },
  {
    id: 'EMP002',
    name: 'Michael Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    role: 'Product Designer',
    department: 'Design',
    email: 'michael.c@company.com',
    status: 'Late',
    checkInTime: '09:32 AM',
    attendanceRate: 92,
    phone: '+1 (555) 019-8831',
    faceMatchedId: 'FACE-3120'
  },
  {
    id: 'EMP003',
    name: 'Amara Okafor',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    role: 'Operations Director',
    department: 'Operations',
    email: 'amara.o@company.com',
    status: 'Present',
    checkInTime: '08:50 AM',
    attendanceRate: 96,
    phone: '+1 (555) 019-4452',
    faceMatchedId: 'FACE-8025'
  },
  {
    id: 'EMP004',
    name: 'David Miller',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    role: 'Security Specialist',
    department: 'Security',
    email: 'david.m@company.com',
    status: 'Present',
    checkInTime: '07:55 AM',
    attendanceRate: 100,
    phone: '+1 (555) 019-7711',
    faceMatchedId: 'FACE-4491'
  },
  {
    id: 'EMP005',
    name: 'Emma Watson',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'HR Business Partner',
    department: 'HR',
    email: 'emma.w@company.com',
    status: 'On Leave',
    attendanceRate: 94,
    phone: '+1 (555) 019-6123',
    faceMatchedId: 'FACE-1082'
  },
  {
    id: 'EMP006',
    name: 'Ryan Thompson',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
    role: 'Backend Developer',
    department: 'Engineering',
    email: 'ryan.t@company.com',
    status: 'Absent',
    attendanceRate: 88,
    phone: '+1 (555) 019-9150',
    faceMatchedId: 'FACE-7214'
  },
  {
    id: 'EMP007',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    role: 'Frontend Architect',
    department: 'Engineering',
    email: 'elena.r@company.com',
    status: 'Present',
    checkInTime: '08:58 AM',
    attendanceRate: 97,
    phone: '+1 (555) 019-3388',
    faceMatchedId: 'FACE-5591'
  },
  {
    id: 'EMP008',
    name: 'Carlos Mendez',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
    role: 'Support Engineer',
    department: 'Operations',
    email: 'carlos.m@company.com',
    status: 'Late',
    checkInTime: '09:18 AM',
    attendanceRate: 91,
    phone: '+1 (555) 019-2219',
    faceMatchedId: 'FACE-2911'
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'ACT001',
    type: 'check_in',
    employeeName: 'Sarah Jenkins',
    role: 'Lead AI Engineer',
    department: 'Engineering',
    detail: 'Face Recognition Match (99.8% precision)',
    time: '08:45 AM',
    cameraName: 'Main Entrance (Block A)'
  },
  {
    id: 'ACT002',
    type: 'check_in',
    employeeName: 'Amara Okafor',
    role: 'Operations Director',
    department: 'Operations',
    detail: 'Face Recognition Match (98.9% precision)',
    time: '08:50 AM',
    cameraName: 'Main Entrance (Block A)'
  },
  {
    id: 'ACT003',
    type: 'check_in',
    employeeName: 'Elena Rostova',
    role: 'Frontend Architect',
    department: 'Engineering',
    detail: 'Face Recognition Match (99.1% precision)',
    time: '08:58 AM',
    cameraName: 'Server Room Entrance'
  },
  {
    id: 'ACT004',
    type: 'alert',
    detail: 'Intrusion alert in Server Room: Unidentified entry attempt detected on Cam-03',
    time: '09:05 AM',
    cameraName: 'Server Room Area',
    status: 'critical'
  },
  {
    id: 'ACT005',
    type: 'check_in',
    employeeName: 'Carlos Mendez',
    role: 'Support Engineer',
    department: 'Operations',
    detail: 'Face Recognition Match (97.4% precision) - Marked Late',
    time: '09:18 AM',
    cameraName: 'Main Entrance (Block A)'
  },
  {
    id: 'ACT006',
    type: 'check_in',
    employeeName: 'Michael Chen',
    role: 'Product Designer',
    department: 'Design',
    detail: 'Authorized access - High-contrast face match (96.2%) - Marked Late',
    time: '09:32 AM',
    cameraName: 'Parking Lot Exit'
  },
  {
    id: 'ACT007',
    type: 'alert',
    detail: 'Motion Alert on Perimeter Fence: Unusual layout motion detected on Cam-02',
    time: '11:15 AM',
    cameraName: 'Parking Lot North Fence',
    status: 'warning'
  },
  {
    id: 'ACT008',
    type: 'system',
    detail: 'Weekly Cloud Backup executed successfully. 4.2TB data synchronized.',
    time: '12:00 PM',
    status: 'info'
  }
];

export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: 'LR001',
    employeeName: 'Ryan Thompson',
    department: 'Engineering',
    role: 'Backend Developer',
    leaveType: 'Sick',
    startDate: '2026-05-24',
    endDate: '2026-05-25',
    reason: 'Severe food poisoning, resting on doctor instructions.',
    status: 'Pending'
  },
  {
    id: 'LR002',
    employeeName: 'Emma Watson',
    department: 'HR',
    role: 'HR Business Partner',
    leaveType: 'Casual',
    startDate: '2026-05-24',
    endDate: '2026-05-26',
    reason: 'Family event out of town. Relocation support needed.',
    status: 'Pending'
  },
  {
    id: 'LR003',
    employeeName: 'Elena Rostova',
    department: 'Engineering',
    role: 'Frontend Architect',
    leaveType: 'Annual',
    startDate: '2026-06-10',
    endDate: '2026-06-15',
    reason: 'Pre-planned personal annual vacation.',
    status: 'Approved'
  },
  {
    id: 'LR004',
    employeeName: 'Michael Chen',
    department: 'Design',
    role: 'Product Designer',
    leaveType: 'Sick',
    startDate: '2026-05-18',
    endDate: '2026-05-18',
    reason: 'Dental emergency extraction checkup.',
    status: 'Approved'
  },
  {
    id: 'LR011',
    employeeName: 'Carlos Mendez',
    department: 'Operations',
    role: 'Support Engineer',
    leaveType: 'LOP',
    startDate: '2026-05-29',
    endDate: '2026-05-30',
    reason: 'Personal urgent real estate paperwork filing.',
    status: 'Pending'
  }
];

export const initialCameras: Camera[] = [
  {
    id: 'CAM-01',
    name: 'Main Entrance A',
    location: 'Block A - Ground Floor Ground Lobby',
    status: 'LIVE',
    alertFlag: false,
    resolution: '1080p @ 30fps',
    fps: 30,
    noiseLevel: 'Ultra Low',
    feedColor: 'bg-emerald-950/40 border-emerald-500/30'
  },
  {
    id: 'CAM-02',
    name: 'Parking Lot B Gate',
    location: 'Outdoor - North Perimeter Wing',
    status: 'LIVE',
    alertFlag: true,
    alertMsg: 'Motion Detected near Vehicle Bay - Area Secure Check Ongoing',
    resolution: '1080p @ 30fps',
    fps: 28,
    noiseLevel: 'Medium',
    feedColor: 'bg-amber-950/40 border-amber-500/40 animate-pulse'
  },
  {
    id: 'CAM-03',
    name: 'Server Vault Inner Room',
    location: 'Block C - Floor 2 Server Wing',
    status: 'REC',
    alertFlag: false,
    resolution: '4K @ 24fps',
    fps: 24,
    noiseLevel: 'Zero Noise',
    feedColor: 'bg-rose-950/40 border-rose-500/30'
  },
  {
    id: 'CAM-04',
    name: 'Emergency Exit Corridor',
    location: 'Block B - South End Ground Exit',
    status: 'OFFLINE',
    alertFlag: false,
    resolution: '720p @ 15fps',
    fps: 0,
    noiseLevel: 'Disconnected',
    feedColor: 'bg-zinc-950 border-zinc-700/50'
  }
];

export const initialTrackLogs: ActivityLog[] = [
  {
    id: 'TRK001',
    type: 'check_in',
    employeeName: 'Sarah Jenkins',
    cameraName: 'Main Entrance A',
    time: '08:45 AM',
    duration: '1.2s'
  },
  {
    id: 'TRK002',
    type: 'check_in',
    employeeName: 'Amara Okafor',
    cameraName: 'Main Entrance A',
    time: '08:50 AM',
    duration: '0.8s'
  },
  {
    id: 'TRK003',
    type: 'system',
    cameraName: 'Parking Lot B Gate',
    detail: 'Smart AI trigger: Vehicle #TX-9021-A detected entering parking structure.',
    time: '08:52 AM',
    duration: '2.5s'
  },
  {
    id: 'TRK004',
    type: 'check_in',
    employeeName: 'David Miller',
    cameraName: 'Server Vault Inner Room',
    time: '08:55 AM',
    duration: '0.5s'
  },
  {
    id: 'TRK005',
    type: 'check_in',
    employeeName: 'Elena Rostova',
    cameraName: 'Server Vault Inner Room',
    time: '08:58 AM',
    duration: '0.9s'
  },
  {
    id: 'TRK006',
    type: 'alert',
    cameraName: 'Parking Lot B Gate',
    detail: 'Anomalous thermal profile detected near boundary fence line.',
    time: '09:05 AM',
    duration: '4.1s'
  },
  {
    id: 'TRK007',
    type: 'check_in',
    employeeName: 'Carlos Mendez',
    cameraName: 'Main Entrance A',
    time: '09:18 AM',
    duration: '1.1s'
  },
  {
    id: 'TRK008',
    type: 'check_in',
    employeeName: 'Michael Chen',
    cameraName: 'Parking Lot B Gate',
    time: '09:32 AM',
    duration: '1.4s'
  }
];

export const initialCanteenVisits: CanteenVisit[] = [
  {
    id: 'CAN001',
    employeeName: 'Sarah Jenkins',
    department: 'Engineering',
    item: 'Chai Latte & Avocado Toast toast',
    time: '09:05 AM',
    mealType: 'Breakfast'
  },
  {
    id: 'CAN002',
    employeeName: 'Amara Okafor',
    department: 'Operations',
    item: 'Cappuccino & Oatmeal Bowl',
    time: '09:15 AM',
    mealType: 'Breakfast'
  },
  {
    id: 'CAN003',
    employeeName: 'David Miller',
    department: 'Security',
    item: 'Double Espresso & Ham Toast Sandwich',
    time: '09:30 AM',
    mealType: 'Breakfast'
  },
  {
    id: 'CAN004',
    employeeName: 'Elena Rostova',
    department: 'Engineering',
    item: 'Grilled Chicken Salad & Fruit Smoothie',
    time: '01:05 PM',
    mealType: 'Lunch'
  },
  {
    id: 'CAN005',
    employeeName: 'Michael Chen',
    department: 'Design',
    item: 'Quinoa Veggie Mix & Iced Matcha Green Tea',
    time: '01:15 PM',
    mealType: 'Lunch'
  },
  {
    id: 'CAN006',
    employeeName: 'Carlos Mendez',
    department: 'Operations',
    item: 'Double Crust Pepperoni slice & diet soda',
    time: '01:28 PM',
    mealType: 'Lunch'
  }
];

export const initialShifts: Shift[] = [
  {
    id: 'SHF-01',
    name: 'Standard Morning Shift (A)',
    type: 'General Staff',
    timeRange: '09:00 AM - 06:00 PM',
    gracePeriod: '15 Minutes',
    assignedStaffCount: 18
  },
  {
    id: 'SHF-02',
    name: 'Early Security Shift (S1)',
    type: 'Security Guard Force',
    timeRange: '06:00 AM - 02:00 PM',
    gracePeriod: '5 Minutes',
    assignedStaffCount: 4
  },
  {
    id: 'SHF-03',
    name: 'Late Security Shift (S2)',
    type: 'Security Guard Force',
    timeRange: '02:00 PM - 10:00 PM',
    gracePeriod: '5 Minutes',
    assignedStaffCount: 4
  },
  {
    id: 'SHF-04',
    name: 'Critical Systems Night Shift',
    type: 'Engineering Ops Force',
    timeRange: '10:00 PM - 06:00 AM',
    gracePeriod: '10 Minutes',
    assignedStaffCount: 3
  }
];

export const initialHolidays: Holiday[] = [
  {
    id: 'HD001',
    name: 'Memorial Day Break',
    date: '2026-05-25',
    day: 'Monday',
    type: 'National'
  },
  {
    id: 'HD002',
    name: 'Summer Solstice Observance',
    date: '2026-06-21',
    day: 'Sunday',
    type: 'Restricted'
  },
  {
    id: 'HD003',
    name: 'Independence Day Grid Holiday',
    date: '2026-07-04',
    day: 'Saturday',
    type: 'National'
  },
  {
    id: 'HD004',
    name: 'Autumn Equinox Rest Day',
    date: '2026-09-22',
    day: 'Tuesday',
    type: 'Gazetted'
  },
  {
    id: 'HD005',
    name: 'Thanksgiving Company Carnival',
    date: '2026-11-26',
    day: 'Thursday',
    type: 'Gazetted'
  }
];

export const initialSecurityEvents: SecurityEvent[] = [
  {
    id: 'SE001',
    source: 'Fire',
    type: 'info',
    message: 'Thermal sensor test initiated. All 12 sectors responding nominal.',
    timestamp: '2026-05-24 08:00 AM'
  },
  {
    id: 'SE002',
    source: 'Secured',
    type: 'info',
    message: 'Main gate facial capture relay activated successfully.',
    timestamp: '2026-05-24 08:30 AM'
  },
  {
    id: 'SE003',
    source: 'Monitor',
    type: 'warning',
    message: 'NVR Storage Unit 1 reached 87% pool capacity. Auto-wipe oldest tags pending.',
    timestamp: '2026-05-24 09:12 AM'
  },
  {
    id: 'SE004',
    source: 'Secured',
    type: 'critical',
    message: 'Authorized Personnel Only bypass attempt near Server Room back-door.',
    timestamp: '2026-05-24 10:45 AM'
  },
  {
    id: 'SE005',
    source: 'Fire',
    type: 'info',
    message: 'CO2 concentration monitor reading 380ppm (optimal office air quality index).',
    timestamp: '2026-05-24 11:30 AM'
  },
  {
    id: 'SE006',
    source: 'Monitor',
    type: 'info',
    message: 'Camera health relay check completely healthy. No frame droppage.',
    timestamp: '2026-05-24 12:45 PM'
  }
];
