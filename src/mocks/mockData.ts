import type {
  AttendanceRecord,
  Child,
  Notice,
  Parent,
  QueueItem,
  Teacher,
} from '../types';

/**
 * Placeholder data so every screen is interactive before the backend
 * exposes real endpoints. Swap for real API calls per-screen; shapes
 * match `src/types` so that should be a drop-in change. Mirrors
 * mobile_app/src/mocks/mockData so both clients show the same demo data.
 */

export const mockTeachers: Teacher[] = [
  {
    id: 'teacher-1',
    fullName: 'Taylor Teacher',
    email: 'teacher@school.test',
    roomName: 'Room 12',
    studentIds: ['child-1', 'child-2'],
  },
  {
    id: 'teacher-2',
    fullName: 'Jordan Jones',
    email: 'jordan@school.test',
    roomName: 'Room 4',
    studentIds: ['child-3'],
  },
];

export const mockChildren: Child[] = [
  {
    id: 'child-1',
    fullName: 'Sam Parent-Kid',
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    status: 'AT_HOME',
  },
  {
    id: 'child-2',
    fullName: 'Riley Parent-Kid',
    parentId: 'parent-1',
    teacherId: 'teacher-1',
    status: 'AT_HOME',
  },
  {
    id: 'child-3',
    fullName: 'Casey Kid',
    parentId: 'parent-2',
    teacherId: 'teacher-2',
    status: 'PRESENT',
  },
];

const today = new Date().toISOString().slice(0, 10);

export const mockAttendance: AttendanceRecord[] = [
  { childId: 'child-1', date: today, status: 'PENDING' },
  { childId: 'child-2', date: today, status: 'PENDING' },
  { childId: 'child-3', date: today, status: 'PRESENT' },
];

export const mockParents: Parent[] = [
  {
    id: 'parent-1',
    fullName: 'Parker Parent',
    phoneNumber: '555-0100',
    email: 'parent@school.test',
    childIds: ['child-1', 'child-2'],
  },
  {
    id: 'parent-2',
    fullName: 'Morgan Guardian',
    phoneNumber: '555-0101',
    email: 'morgan@school.test',
    childIds: ['child-3'],
  },
];

export const mockQueue: QueueItem[] = [];

export const mockNotices: Notice[] = [
  {
    id: 'notice-1',
    title: 'Early Dismissal Friday',
    body: 'School will dismiss at 1:00 PM this Friday for staff development.',
    senderName: 'Alex Admin',
    senderRole: 'admin',
    createdAt: new Date().toISOString(),
    read: false,
  },
  {
    id: 'notice-2',
    title: 'Room 12 Field Trip Reminder',
    body: 'Please return signed permission slips by Wednesday.',
    senderName: 'Taylor Teacher',
    senderRole: 'teacher',
    createdAt: new Date().toISOString(),
    read: false,
  },
];
