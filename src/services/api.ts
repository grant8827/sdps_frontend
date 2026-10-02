import type { AuthSession, Child, LoginResult, Notice, QueueItem } from '../types';

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

// The school an admin is currently working in (school switcher in the
// top bar). Sent as X-School-ID so a district admin — or anyone in more
// than one school — acts on the school they picked; the server checks
// they actually have access to it. Unset for single-school users.
let activeSchoolId: string | null = null;
export function setActiveSchoolId(schoolId: string | null): void {
  activeSchoolId = schoolId;
}
const schoolHeader = (): Record<string, string> => (activeSchoolId ? { 'X-School-ID': activeSchoolId } : {});

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}`, ...schoolHeader() } : {}), ...options.headers },
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
  if (!response.ok) throw new ApiError(body?.error || 'Request failed', response.status);
  return body as T;
}

/**
 * Downloads an export as a file. Goes through fetch (not a plain link)
 * so the Authorization header is sent; the server names the file.
 */
async function downloadFile(path: string, token: string, fallbackName: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api${path}`, { headers: { Authorization: `Bearer ${token}`, ...schoolHeader() } });
  if (response.status === 401) unauthorizedListener?.();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error || 'Download failed', response.status);
  }
  const name = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url);
}

/** A failed API call, with its HTTP status (e.g. 410 = a sign-in step expired; start over). */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export const api = {
  login: (identifier: string, password: string) => request<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  registerSchool: (input: { schoolName: string; campusName: string; campusAddress?: string; adminFullName: string; email: string; password: string }) =>
    request<LoginResult>('/auth/register-school', { method: 'POST', body: JSON.stringify(input) }),
  // Two-step verification during sign-in (mfaToken comes from login/registerSchool).
  mfaVerify: (mfaToken: string, code: string) =>
    request<AuthSession & { recoveryCodesLeft?: number }>('/auth/mfa/verify', { method: 'POST', body: JSON.stringify({ mfaToken, code }) }),
  mfaSetup: (mfaToken: string) => request<MfaEnrollment>('/auth/mfa/setup', { method: 'POST', body: JSON.stringify({ mfaToken }) }),
  mfaSetupConfirm: (mfaToken: string, code: string) =>
    request<AuthSession & { recoveryCodes: string[] }>('/auth/mfa/setup/confirm', { method: 'POST', body: JSON.stringify({ mfaToken, code }) }),
  // Two-step verification for the signed-in account (Security page).
  myMfa: (token: string) => request<MfaStatus>('/me/mfa', {}, token),
  myMfaSetup: (token: string) => request<MfaEnrollment>('/me/mfa/setup', { method: 'POST' }, token),
  myMfaConfirm: (token: string, code: string) => request<{ recoveryCodes: string[] }>('/me/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) }, token),
  myMfaDisable: (token: string, password: string) => request<void>('/me/mfa/disable', { method: 'POST', body: JSON.stringify({ password }) }, token),
  myMfaNewRecoveryCodes: (token: string, code: string) =>
    request<{ recoveryCodes: string[] }>('/me/mfa/recovery-codes', { method: 'POST', body: JSON.stringify({ code }) }, token),
  districtOverview: (token: string) => request<DistrictSchool[]>('/district/overview', {}, token),
  // Data & Privacy (school admins).
  exportStudent: (token: string, studentId: string) => downloadFile(`/admin/students/${studentId}/export`, token, 'student-record.json'),
  exportSchool: (token: string) => downloadFile('/admin/export', token, 'school-data.json'),
  removedStudents: (token: string) => request<RemovedStudent[]>('/admin/students/removed', {}, token),
  restoreStudent: (token: string, studentId: string) => request<void>(`/admin/students/${studentId}/restore`, { method: 'POST' }, token),
  permanentlyDeleteStudent: (token: string, studentId: string, confirmName: string, reason?: string) =>
    request<{ deleted: Record<string, number> }>(`/admin/students/${studentId}/permanent`, { method: 'DELETE', body: JSON.stringify({ confirmName, reason }) }, token),
  retention: (token: string) => request<RetentionSettings>('/admin/retention', {}, token),
  saveRetention: (token: string, settings: { removedStudentRetentionDays: number | null; queueHistoryRetentionDays: number | null }) =>
    request<void>('/admin/retention', { method: 'PATCH', body: JSON.stringify(settings) }, token),
  runRetention: (token: string) => request<{ studentsDeleted: number; pickupHistoryDeleted: number }>('/admin/retention/run', { method: 'POST' }, token),
  resetStaffMfa: (token: string, userId: string) => request<void>(`/admin/staff/${userId}/reset-mfa`, { method: 'POST' }, token),
  myStudents: (token: string) => request<Child[]>('/me/students', {}, token),
  myAttendance: (token: string) => request<MyAttendanceChild[]>('/me/attendance', {}, token),
  myClasses: (token: string) => request<MyClassChild[]>('/me/classes', {}, token),
  requestDropOff: (token: string, studentId: string, location: { latitude: number; longitude: number }) => request<{ id: string }>(`/me/students/${studentId}/drop-off`, { method: 'POST', body: JSON.stringify(location) }, token),
  requestPickUp: (token: string, studentId: string, location: { latitude: number; longitude: number }) => request<{ id: string }>(`/me/students/${studentId}/pick-up`, { method: 'POST', body: JSON.stringify(location) }, token),
  teacherQueue: (token: string) => request<QueueItem[]>('/teacher/queue', {}, token),
  adminQueue: (token: string) => request<QueueItem[]>('/admin/queue', {}, token),
  /** `code` is the parent's one-time pickup code; `overrideReason` (admins only) releases a pickup without it. */
  approveQueueItem: (token: string, queueItemId: string, verification: { code?: string; overrideReason?: string } = {}) =>
    request<void>(`/queue/${queueItemId}/approve`, { method: 'POST', body: JSON.stringify(verification) }, token),
  declineQueueItem: (token: string, queueItemId: string) => request<void>(`/queue/${queueItemId}/decline`, { method: 'POST' }, token),
  adminOverview: (token: string) => request<AdminOverview>('/admin/overview', {}, token),
  adminSetup: (token: string) => request<AdminSetup>('/admin/setup', {}, token),
  updateSchoolProfile: (token: string, input: { name?: string; address?: string; startTime?: string; dismissalTime?: string; extendedTime?: string }) =>
    request<void>('/admin/school', { method: 'PATCH', body: JSON.stringify(input) }, token),
  addCampus: (token: string, input: { name: string; address: string; geofenceRadius?: number; startTime?: string; dismissalTime?: string; extendedTime?: string }) =>
    request<{ id: string; latitude: number; longitude: number }>('/admin/campuses', { method: 'POST', body: JSON.stringify(input) }, token),
  /** Suspends (drop-off/pick-up paused there) or reactivates a location. */
  setCampusActive: (token: string, campusId: string, active: boolean) =>
    request<void>(`/admin/campuses/${campusId}/status`, { method: 'POST', body: JSON.stringify({ active }) }, token),
  /** Removes an added (non-primary) location; its students and classes move to the primary location. */
  removeCampus: (token: string, campusId: string) =>
    request<{ moved: { students: number; classes: number } }>(`/admin/campuses/${campusId}`, { method: 'DELETE' }, token),
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
  activateSchoolYear: (token: string, schoolYearId: string) =>
    request<void>(`/admin/school-years/${schoolYearId}/activate`, { method: 'POST' }, token),
  guardians: (token: string) => request<Guardian[]>('/admin/guardians', {}, token),
  addGuardian: (token: string, input: { fullName: string; email: string; phone?: string; temporaryPassword: string }) =>
    request<{ id: string }>('/admin/guardians', { method: 'POST', body: JSON.stringify(input) }, token),
  setGuardianActive: (token: string, guardianId: string, active: boolean) =>
    request<void>(`/admin/guardians/${guardianId}`, { method: 'PATCH', body: JSON.stringify({ active }) }, token),
  deleteGuardian: (token: string, guardianId: string) => request<void>(`/admin/guardians/${guardianId}`, { method: 'DELETE' }, token),
  teacherAttendance: (token: string, date?: string) => request<AttendanceRow[]>(`/teacher/attendance${date ? `?date=${date}` : ''}`, {}, token),
  teacherClass: (token: string) => request<TeacherClass | null>('/teacher/class', {}, token),
  teacherStudents: (token: string) => request<RosterStudent[]>('/teacher/students', {}, token),
  teacherAttendanceHistory: (token: string) => request<TeacherAttendanceStudent[]>('/teacher/attendance-history', {}, token),
  adminAttendance: (token: string, classId: string, date?: string) =>
    request<AttendanceRow[]>(`/admin/attendance?classId=${encodeURIComponent(classId)}${date ? `&date=${date}` : ''}`, {}, token),
  adminAttendanceSummary: (token: string, date?: string) =>
    request<AttendanceSummary>(`/admin/attendance/summary${date ? `?date=${date}` : ''}`, {}, token),
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
  staff: (token: string) => request<StaffRow[]>('/admin/staff', {}, token),
  addStaff: (token: string, input: { fullName: string; email: string; password: string; photoDataUrl?: string; classId?: string; role: StaffRole }) =>
    request<{ id: string; restored: boolean }>('/admin/staff', { method: 'POST', body: JSON.stringify(input) }, token),
  setStaffStatus: (token: string, staffId: string, active: boolean) =>
    request<void>(`/admin/staff/${staffId}`, { method: 'PATCH', body: JSON.stringify({ active }) }, token),
  deleteStaff: (token: string, staffId: string) => request<void>(`/admin/staff/${staffId}`, { method: 'DELETE' }, token),
  teacherParents: (token: string) => request<{ id: string; fullName: string }[]>('/teacher/parents', {}, token),
  sendNotice: (token: string, input: { title: string; body: string; targetType: 'SCHOOL' | 'CLASS' | 'PARENT' | 'STAFF' | 'ADMIN' | 'TEACHER'; targetParentUserId?: string; targetStaffUserId?: string }) =>
    request<void>('/notices', { method: 'POST', body: JSON.stringify(input) }, token),
  myNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/me/notices', {}, token)
      .then(rows => rows.map(row => ({ ...row, read: Boolean(row.read) }))),
  markNoticeRead: (token: string, noticeId: string) => request<void>(`/notices/${noticeId}/read`, { method: 'POST' }, token),
  inviteGuardian: (token: string, input: { fullName: string; email: string; phone?: string; relationship: string; temporaryPassword: string }) =>
    request<{ id: string; status: 'PENDING' }>('/me/guardians', { method: 'POST', body: JSON.stringify(input) }, token),
  myGuardians: (token: string) => request<MyGuardians>('/me/guardians', {}, token),
  guardianRequests: (token: string) => request<GuardianRequest[]>('/admin/guardian-requests', {}, token),
  approveGuardianRequest: (token: string, batchId: string, canManage: boolean) =>
    request<void>(`/admin/guardian-requests/${batchId}/approve`, { method: 'POST', body: JSON.stringify({ canManage }) }, token),
  rejectGuardianRequest: (token: string, batchId: string, note?: string) =>
    request<void>(`/admin/guardian-requests/${batchId}/reject`, { method: 'POST', body: JSON.stringify({ note }) }, token),
  auditLog: (token: string, filters: { action?: string; before?: AuditEntry } = {}) => {
    const params = new URLSearchParams({ limit: '50' });
    if (filters.action) params.set('action', filters.action);
    if (filters.before) { params.set('beforeCreatedAt', filters.before.createdAt); params.set('beforeId', filters.before.id); }
    return request<AuditLogPage>(`/admin/audit-log?${params}`, {}, token);
  },
  adminNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/admin/notices', {}, token)
      .then(rows => rows.map(row => ({ ...row, read: Boolean(row.read) }))),
  /** Staff inbox — shared by the admin dashboard's Notices tab and the teacher app's Notices tab. */
  staffNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/staff/notices', {}, token)
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
  /** The school's first location — always shown, can't be removed. */
  isPrimary?: boolean;
  createdAt?: string; // UTC 'YYYY-MM-DD HH:MM:SS'
  /** SUSPENDED = drop-off/pick-up paused at this location. */
  status?: 'ACTIVE' | 'SUSPENDED';
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
  /** Arrived after the school's start time — only meaningful when status is PRESENT. */
  late: boolean;
}
export interface AttendanceSummary { present: number; absent: number; sick: number; late: number; unmarked: number; total: number }
export interface TeacherClass { id: string; name: string; roomName: string | null; gradeName: string }
export interface RosterStudent { id: string; fullName: string; photoUrl?: string; status: 'ACTIVE' | 'SUSPENDED' }
export interface TeacherAttendanceStudent {
  id: string;
  fullName: string;
  records: { date: string; status: 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY'; late: boolean }[];
}
export interface MyAttendanceChild {
  id: string;
  fullName: string;
  className?: string;
  teacherName?: string;
  records: { date: string; status: 'PRESENT' | 'ABSENT' | 'SICK' | 'SUSPENDED' | 'HOLIDAY'; late: boolean }[];
}
export interface MyClassChild {
  id: string;
  fullName: string;
  photoUrl: string | null;
  gradeName: string | null;
  className: string | null;
  roomName: string | null;
  teacherName: string | null;
}
export interface PromotionPreview { studentId: string; fullName: string; fromGrade: string; proposedGrade: { id: string; name: string } | null; alreadyEnrolled: boolean }
export interface Guardian {
  id: string;
  /** The underlying user id — what notices target (target_parent_user_id), distinct from the guardian record's own id. */
  userId: string;
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
/** Role sent to POST /admin/staff — 'admin' and 'front_desk' both land on the admin dashboard; only 'teacher' can take a classId. */
export type StaffRole = 'teacher' | 'admin' | 'front_desk';
export type GuardianRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
/** One parent submission ("please authorize this adult"), covering one or more children. */
export interface GuardianRequest {
  batchId: string;
  status: GuardianRequestStatus;
  fullName: string;
  email: string;
  phone: string | null;
  relationship: string;
  requestedByName: string;
  requestedAt: string; // UTC 'YYYY-MM-DD HH:MM:SS'
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  students: string[];
}
export interface MyGuardians {
  authorized: { guardianId: string; fullName: string; relationship: string; canPickUp: number; students: string[] }[];
  requests: { batchId: string; fullName: string; relationship: string; status: GuardianRequestStatus; requestedAt: string; decidedAt: string | null; decisionNote: string | null; students: string[] }[];
}
export interface AuditEntry {
  id: string;
  createdAt: string; // 'YYYY-MM-DD HH:MM:SS', UTC
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}
export interface AuditLogPage { entries: AuditEntry[]; hasMore: boolean; actions: string[] }
export interface DistrictSchool {
  schoolId: string; schoolName: string; schoolCode: string; districtName: string;
  students: number; teachers: number; presentToday: number; pendingRequests: number; pendingGuardianApprovals: number;
}
export interface RemovedStudent { id: string; fullName: string; studentNumber: string | null; removedAt: string; purgeAfter: string | null }
export interface RetentionSettings {
  removedStudentRetentionDays: number | null;
  queueHistoryRetentionDays: number | null;
  minimumDays: number;
  wouldDeleteNow: { removedStudents: number; pickupHistory: number };
}
export interface MfaEnrollment { secret: string; otpauthUri: string }
export interface MfaStatus { enabled: boolean; enabledAt: string | null; required: boolean; recoveryCodesLeft: number }
export interface StaffRow {
  id: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  active: boolean;
  mfaEnabled?: boolean;
  /** Raw membership role as stored — 'school_admin' is the Admin role, 'staff' is Front Desk / Office Staff. */
  role: 'teacher' | 'school_admin' | 'staff';
  classId?: string;
  className?: string;
}
