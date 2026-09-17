import type { AuthSession, Child, Notice, QueueItem } from '../types';

// Empty by default — a bare `/api${path}` relative fetch, which is
// correct both for local dev (Vite's server.proxy in vite.config.ts
// forwards /api to the backend) and for a same-origin deploy (the
// backend serving this app's own build as static files). Only needs to
// be set when frontend and backend are deployed as separate origins
// (e.g. two separate Railway services) — VITE_API_URL is read at BUILD
// time, not runtime, so changing it requires a rebuild, not just a
// restart.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

// A 401 means the server no longer recognizes this token (expired, or
// revoked — sessions are persisted server-side, but they can still
// genuinely run out). Screens that poll silently swallow request errors,
// so without this a dead token used to render as "no data" instead of
// prompting a re-login. AuthContext subscribes to fire an actual logout.
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;
export function onUnauthorized(listener: UnauthorizedListener): void {
  unauthorizedListener = listener;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
  } catch {
    throw new Error('Cannot reach the server. Please try again in a moment.');
  }
  if (response.status === 401 && token) unauthorizedListener?.();
  const contentType = response.headers.get('content-type') || '';
  const body = response.status === 204
    ? null
    : contentType.includes('application/json')
      ? await response.json()
      : null;
  if (!contentType.includes('application/json') && response.status !== 204) {
    throw new Error('The server is not configured correctly. Please contact support.');
  }
  if (!response.ok) throw new Error(body?.error || 'Request failed');
  return body as T;
}

export const api = {
  login: (identifier: string, password: string) => request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  registerSchool: (input: { schoolName: string; campusName: string; campusAddress?: string; adminFullName: string; email: string; password: string }) =>
    request<AuthSession>('/auth/register-school', { method: 'POST', body: JSON.stringify(input) }),
  myStudents: (token: string) => request<Child[]>('/me/students', {}, token),
  myAttendance: (token: string) => request<MyAttendanceChild[]>('/me/attendance', {}, token),
  requestDropOff: (token: string, studentId: string, location: { latitude: number; longitude: number }) => request<{ id: string }>(`/me/students/${studentId}/drop-off`, { method: 'POST', body: JSON.stringify(location) }, token),
  requestPickUp: (token: string, studentId: string, location: { latitude: number; longitude: number }) => request<{ id: string }>(`/me/students/${studentId}/pick-up`, { method: 'POST', body: JSON.stringify(location) }, token),
  teacherQueue: (token: string) => request<QueueItem[]>('/teacher/queue', {}, token),
  adminQueue: (token: string) => request<QueueItem[]>('/admin/queue', {}, token),
  approveQueueItem: (token: string, queueItemId: string) => request<void>(`/queue/${queueItemId}/approve`, { method: 'POST' }, token),
  declineQueueItem: (token: string, queueItemId: string) => request<void>(`/queue/${queueItemId}/decline`, { method: 'POST' }, token),
  adminOverview: (token: string) => request<AdminOverview>('/admin/overview', {}, token),
  adminSetup: (token: string) => request<AdminSetup>('/admin/setup', {}, token),
  updateSchoolProfile: (token: string, input: { name?: string; address?: string; startTime?: string; dismissalTime?: string; extendedTime?: string }) =>
    request<void>('/admin/school', { method: 'PATCH', body: JSON.stringify(input) }, token),
  addCampus: (token: string, input: { name: string; address: string; geofenceRadius?: number; startTime?: string; dismissalTime?: string; extendedTime?: string }) =>
    request<{ id: string; latitude: number; longitude: number }>('/admin/campuses', { method: 'POST', body: JSON.stringify(input) }, token),
  updateCampus: (token: string, campusId: string, input: { name?: string; address?: string; geofenceRadius?: number; startTime?: string; dismissalTime?: string; extendedTime?: string }) =>
    request<void>(`/admin/campuses/${campusId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  students: (token: string) => request<Student[]>('/admin/students', {}, token),
  addStudent: (token: string, input: unknown) => request<{ id: string }>('/admin/students', { method: 'POST', body: JSON.stringify(input) }, token),
  setStudentStatus: (token: string, studentId: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<void>(`/admin/students/${studentId}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  deleteStudent: (token: string, studentId: string) => request<void>(`/admin/students/${studentId}`, { method: 'DELETE' }, token),
  promotionPreview: (token: string, from: string, to: string) => request<PromotionPreview[]>(`/admin/promotions/preview?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {}, token),
  promote: (token: string, fromSchoolYearId: string, toSchoolYearId: string) => request<{ promoted: number }>('/admin/promotions', { method: 'POST', body: JSON.stringify({ fromSchoolYearId, toSchoolYearId }) }, token),
  promoteByGrade: (token: string, input: { fromSchoolYearId: string; toSchoolYearId: string; fromGradeLevelId: string; toGradeLevelId: string; teacherUserId?: string }) =>
    request<{ promoted: number; skipped: number }>('/admin/promotions/by-grade', { method: 'POST', body: JSON.stringify(input) }, token),
  promoteByClass: (token: string, input: { fromClassId: string; toClassId: string; teacherUserId?: string }) =>
    request<{ promoted: number; skipped: number }>('/admin/promotions/by-class', { method: 'POST', body: JSON.stringify(input) }, token),
  guardians: (token: string) => request<Guardian[]>('/admin/guardians', {}, token),
  addGuardian: (token: string, input: { fullName: string; email: string; phone?: string; temporaryPassword: string }) =>
    request<{ id: string }>('/admin/guardians', { method: 'POST', body: JSON.stringify(input) }, token),
  setGuardianActive: (token: string, guardianId: string, active: boolean) =>
    request<void>(`/admin/guardians/${guardianId}`, { method: 'PATCH', body: JSON.stringify({ active }) }, token),
  deleteGuardian: (token: string, guardianId: string) => request<void>(`/admin/guardians/${guardianId}`, { method: 'DELETE' }, token),
  teacherAttendance: (token: string, date?: string) => request<AttendanceRow[]>(`/teacher/attendance${date ? `?date=${date}` : ''}`, {}, token),
  teacherClass: (token: string) => request<TeacherClass | null>('/teacher/class', {}, token),
  teacherStudents: (token: string) => request<RosterStudent[]>('/teacher/students', {}, token),
  adminAttendance: (token: string, classId: string, date?: string) =>
    request<AttendanceRow[]>(`/admin/attendance?classId=${encodeURIComponent(classId)}${date ? `&date=${date}` : ''}`, {}, token),
  markAttendance: (token: string, studentId: string, date: string, status: SettableAttendanceStatus) =>
    request<void>('/attendance', { method: 'POST', body: JSON.stringify({ studentId, date, status }) }, token),
  classes: (token: string) => request<ClassRow[]>('/admin/classes', {}, token),
  addClass: (token: string, input: { name: string; gradeLevelId: string; roomName?: string; schoolYearId: string; campusId?: string }) =>
    request<{ id: string }>('/admin/classes', { method: 'POST', body: JSON.stringify(input) }, token),
  teachers: (token: string) => request<TeacherRow[]>('/admin/teachers', {}, token),
  addTeacher: (token: string, input: { fullName: string; email: string; password: string; photoDataUrl?: string; classId?: string }) =>
    request<{ id: string }>('/admin/teachers', { method: 'POST', body: JSON.stringify(input) }, token),
  updateTeacher: (token: string, teacherId: string, input: { fullName?: string; photoDataUrl?: string; classId?: string | null }) =>
    request<void>(`/admin/teachers/${teacherId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  teacherParents: (token: string) => request<{ id: string; fullName: string }[]>('/teacher/parents', {}, token),
  sendNotice: (token: string, input: { title: string; body: string; targetType: 'SCHOOL' | 'CLASS' | 'PARENT'; targetParentUserId?: string }) =>
    request<void>('/notices', { method: 'POST', body: JSON.stringify(input) }, token),
  myNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/me/notices', {}, token)
      .then(rows => rows.map(row => ({ ...row, read: Boolean(row.read) }))),
  markNoticeRead: (token: string, noticeId: string) => request<void>(`/notices/${noticeId}/read`, { method: 'POST' }, token),
  inviteGuardian: (token: string, input: { fullName: string; email: string; phone?: string; relationship: string; temporaryPassword: string }) =>
    request<{ id: string }>('/me/guardians', { method: 'POST', body: JSON.stringify(input) }, token),
  adminNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/admin/notices', {}, token)
      .then(rows => rows.map(row => ({ ...row, read: Boolean(row.read) }))),
};

export interface AdminOverview { totalStudents: number; activeTeachers: number; presentToday: number; pendingRequests: number }
export interface SchoolProfile {
  id: string;
  name: string;
  code: string;
  address?: string;
  timezone: string;
  status: string;
  startTime: string | null;
  dismissalTime: string | null;
  extendedTime: string | null;
}
export interface CampusProfile {
  id: string;
  name: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number | null;
  startTime: string | null;
  dismissalTime: string | null;
  extendedTime: string | null;
}
export interface AdminSetup {
  school: SchoolProfile;
  schoolYears: { id: string; name: string; status: string }[];
  gradeLevels: { id: string; name: string; sortOrder: number }[];
  classes: { id: string; name: string; schoolYearId: string; gradeLevelId: string }[];
  campuses: CampusProfile[];
  guardians: { id: string; fullName: string; email: string; phone?: string }[];
}
export interface Student extends Child {
  firstName: string;
  lastName: string;
  gradeLevelId: string;
  gradeName: string;
  className?: string;
  photoUrl?: string;
  guardians: { id: string; fullName: string; email: string }[];
  /** ACTIVE/SUSPENDED — separate from `status`, which mirrors pickup status here like everywhere else `Child` is used. */
  enrollmentStatus: 'ACTIVE' | 'SUSPENDED';
}
export type SettableAttendanceStatus = 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY' | 'WEEKEND';
export interface AttendanceRow {
  studentId: string;
  fullName: string;
  photoUrl?: string;
  classId: string;
  className: string;
  status: SettableAttendanceStatus | 'UNMARKED';
}
export interface TeacherClass { id: string; name: string; roomName: string | null; gradeName: string }
export interface RosterStudent { id: string; fullName: string; photoUrl?: string; status: 'ACTIVE' | 'SUSPENDED' }
export interface MyAttendanceChild {
  id: string;
  fullName: string;
  className?: string;
  teacherName?: string;
  records: { date: string; status: 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY'; late: boolean }[];
}
export interface PromotionPreview { studentId: string; fullName: string; fromGrade: string; proposedGrade: { id: string; name: string } | null; alreadyEnrolled: boolean }
export interface Guardian {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  active: boolean;
  children: { id: string; fullName: string }[];
}
export interface ClassRow {
  id: string;
  name: string;
  roomName?: string;
  schoolYearId: string;
  schoolYearName: string;
  gradeLevelId: string;
  gradeName: string;
  campusId?: string;
  teacherId?: string;
  teacherName?: string;
  studentCount: number;
}
export interface TeacherRow {
  id: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  active: boolean;
  classId?: string;
  className?: string;
}
