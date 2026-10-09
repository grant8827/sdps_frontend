import type { AuthSession, Child, LoginResult, Notice, PlatformRole, QueueItem } from '../types';

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
  if (!response.ok) throw new ApiError(body?.error || 'Request failed', response.status, body?.code, body?.triesLeft);
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

/**
 * What creating an account returns about its invite email. When the email
 * couldn't be sent (email not set up yet, or delivery failed), `setupLink`
 * is the one-time link to pass on another way.
 */
export interface InviteResult { emailSent?: boolean; setupLink?: string }

/** A failed API call, with its HTTP status (e.g. 410 = a sign-in step expired; start over). */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    /** Machine-readable reason some endpoints add, e.g. 'PIN_NOT_SET', 'PIN_WRONG', 'PIN_LOCKED'. */
    public readonly code?: string,
    public readonly triesLeft?: number,
  ) {
    super(message);
  }
}

export const api = {
  forgotPassword: (email: string) => request<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  checkAccountLink: (token: string) =>
    request<{ purpose: 'INVITE' | 'RESET' | 'PIN_RESET'; fullName: string; email: string }>('/auth/account-link', { method: 'POST', body: JSON.stringify({ token }) }),
  setPassword: (token: string, password: string) => request<{ email: string }>('/auth/set-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  /** Emails a staff member or parent a fresh invite (never set up) or password reset link. */
  sendAccountLink: (token: string, userId: string) => request<InviteResult>(`/admin/members/${userId}/send-link`, { method: 'POST' }, token),
  login: (identifier: string, password: string) => request<LoginResult>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),
  /** Step 1 of registering: emails a 6-digit code to confirm the address. `required: false` means skip the code step. */
  sendRegistrationCode: (email: string) =>
    request<{ required: boolean; message?: string }>('/auth/register-school/send-code', { method: 'POST', body: JSON.stringify({ email }) }),
  registerSchool: (input: { schoolName: string; campusName: string; campusAddress?: string; adminFullName: string; email: string; password: string; logoDataUrl?: string; emailCode?: string }) =>
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
  /** A pickup needs the parent's own 6-digit pickup PIN. */
  requestPickUp: (token: string, studentId: string, location: { latitude: number; longitude: number }, pin: string) =>
    request<{ id: string }>(`/me/students/${studentId}/pick-up`, { method: 'POST', body: JSON.stringify({ ...location, pin }) }, token),
  // Pickup PIN (parents)
  myPin: (token: string) => request<{ hasPin: boolean }>('/me/pin', {}, token),
  createPin: (token: string, pin: string) => request<void>('/me/pin', { method: 'POST', body: JSON.stringify({ pin }) }, token),
  changePin: (token: string, currentPin: string, newPin: string) => request<void>('/me/pin/change', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) }, token),
  forgotPin: (token: string) => request<{ message: string }>('/me/pin/forgot', { method: 'POST' }, token),
  setPinFromLink: (linkToken: string, pin: string) => request<void>('/auth/set-pin', { method: 'POST', body: JSON.stringify({ token: linkToken, pin }) }),
  teacherQueue: (token: string) => request<QueueItem[]>('/teacher/queue', {}, token),
  adminQueue: (token: string) => request<QueueItem[]>('/admin/queue', {}, token),
  approveQueueItem: (token: string, queueItemId: string) => request<void>(`/queue/${queueItemId}/approve`, { method: 'POST' }, token),
  declineQueueItem: (token: string, queueItemId: string) => request<void>(`/queue/${queueItemId}/decline`, { method: 'POST' }, token),
  adminOverview: (token: string) => request<AdminOverview>('/admin/overview', {}, token),
  adminSetup: (token: string) => request<AdminSetup>('/admin/setup', {}, token),
  /** The signed-in person's school: its name and logo (for the dashboard). */
  mySchool: (token: string) => request<SchoolBranding>('/me/school', {}, token),
  /** logoDataUrl: an image replaces the logo, '' removes it, omitted keeps it. */
  updateSchoolProfile: (token: string, input: { name?: string; address?: string; startTime?: string; dismissalTime?: string; extendedTime?: string; logoDataUrl?: string }) =>
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
  addStudent: (token: string, input: unknown) => request<{ id: string } & InviteResult>('/admin/students', { method: 'POST', body: JSON.stringify(input) }, token),
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
  addGuardian: (token: string, input: { fullName: string; email: string; phone?: string }) =>
    request<{ id: string } & InviteResult>('/admin/guardians', { method: 'POST', body: JSON.stringify(input) }, token),
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
  addTeacher: (token: string, input: { fullName: string; email: string; photoDataUrl?: string; classId?: string }) =>
    request<{ id: string } & InviteResult>('/admin/teachers', { method: 'POST', body: JSON.stringify(input) }, token),
  updateTeacher: (token: string, teacherId: string, input: { fullName?: string; photoDataUrl?: string; classId?: string | null }) =>
    request<void>(`/admin/teachers/${teacherId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  staff: (token: string) => request<StaffRow[]>('/admin/staff', {}, token),
  addStaff: (token: string, input: { fullName: string; email: string; photoDataUrl?: string; classId?: string; role: StaffRole }) =>
    request<{ id: string; restored: boolean } & InviteResult>('/admin/staff', { method: 'POST', body: JSON.stringify(input) }, token),
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
  inviteGuardian: (token: string, input: { fullName: string; email: string; phone?: string; relationship: string }) =>
    request<{ id: string; status: 'PENDING' } & InviteResult>('/me/guardians', { method: 'POST', body: JSON.stringify(input) }, token),
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
  // ---- Platform administration (/api/superadmin) ----
  platformMe: (token: string) => request<PlatformMe>('/superadmin/me', {}, token),
  platformSchools: (token: string, query: { search?: string; status?: string; sort?: string; dir?: 'asc' | 'desc'; page?: number; pageSize?: number }) => {
    const params = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
    return request<Paged<PlatformSchoolRow>>(`/superadmin/schools?${params}`, {}, token);
  },
  platformSchool: (token: string, schoolId: string) => request<PlatformSchoolDetail>(`/superadmin/schools/${schoolId}`, {}, token),
  platformCreateSchool: (token: string, input: { name: string; campusName?: string; campusAddress?: string; adminFullName: string; adminEmail: string; timezone?: string }) =>
    request<{ id: string; code: string } & InviteResult>('/superadmin/schools', { method: 'POST', body: JSON.stringify(input) }, token),
  platformUpdateSchool: (token: string, schoolId: string, input: { name?: string; timezone?: string }) =>
    request<void>(`/superadmin/schools/${schoolId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  platformSchoolAction: (token: string, schoolId: string, action: 'suspend' | 'reactivate' | 'archive', reason: string) =>
    request<void>(`/superadmin/schools/${schoolId}/${action}`, { method: 'POST', body: JSON.stringify({ reason }) }, token),
  platformAuditLogs: (token: string, filters: { schoolId?: string; action?: string; actor?: string; from?: string; to?: string; before?: PlatformAuditEntry } = {}) => {
    const params = new URLSearchParams({ limit: '50' });
    for (const key of ['schoolId', 'action', 'actor', 'from', 'to'] as const) if (filters[key]) params.set(key, filters[key]!);
    if (filters.before) { params.set('beforeCreatedAt', filters.before.createdAt); params.set('beforeId', filters.before.id); }
    return request<{ entries: PlatformAuditEntry[]; hasMore: boolean }>(`/superadmin/audit-logs?${params}`, {}, token);
  },
  platformDashboard: (token: string, refresh = false) => request<PlatformDashboard>(`/superadmin/dashboard${refresh ? '?refresh=1' : ''}`, {}, token),
  platformNeedsAttention: (token: string) => request<{ items: AttentionItem[]; notTracked: string[] }>('/superadmin/needs-attention', {}, token),
  platformSchoolUsers: (token: string, schoolId: string, query: { kind: 'staff' | 'parents'; search?: string; page?: number }) =>
    request<Paged<PlatformSchoolUser>>(`/superadmin/schools/${schoolId}/users?${new URLSearchParams({ kind: query.kind, page: String(query.page ?? 1), ...(query.search ? { search: query.search } : {}) })}`, {}, token),
  platformSchoolStudents: (token: string, schoolId: string, query: { search?: string; page?: number }) =>
    request<Paged<PlatformSchoolStudent>>(`/superadmin/schools/${schoolId}/students?${new URLSearchParams({ page: String(query.page ?? 1), ...(query.search ? { search: query.search } : {}) })}`, {}, token),
  platformSchoolOperations: (token: string, schoolId: string) => request<PlatformSchoolOperations>(`/superadmin/schools/${schoolId}/operations`, {}, token),
  platformSchoolAttendance: (token: string, schoolId: string) =>
    request<{ students: number; days: { date: string; present: number; absent: number; other: number }[] }>(`/superadmin/schools/${schoolId}/attendance`, {}, token),
  platformSchoolSecurity: (token: string, schoolId: string) => request<PlatformSchoolSecurity>(`/superadmin/schools/${schoolId}/security`, {}, token),
  platformSchoolNotifications: (token: string, schoolId: string) =>
    request<{ emailConfigured: boolean; lastThirtyDays: Record<string, number> }>(`/superadmin/schools/${schoolId}/notifications`, {}, token),
  operationsSchools: (token: string, query: { search?: string; page?: number } = {}) =>
    request<Paged<OperationsSchoolRow> & { timezone: string }>(`/superadmin/operations/schools?${toQuery(query)}`, {}, token),
  operationsRequests: (token: string, query: { state: 'waiting' | 'done'; type?: 'DROP_OFF' | 'PICK_UP'; schoolId?: string; page?: number }) =>
    request<Paged<OperationsRequest> & { thresholds: { warn: number; alert: number } }>(`/superadmin/operations/requests?${toQuery(query)}`, {}, token),
  operationsAttendance: (token: string, query: { date?: string; page?: number } = {}) =>
    request<Paged<OperationsAttendanceRow> & { date: string; totals: { present: number; absent: number; late: number } }>(`/superadmin/operations/attendance?${toQuery(query)}`, {}, token),
  operationsIncidents: (token: string, query: { from?: string; to?: string; type?: string; state?: 'open' | 'reviewed' | 'all'; schoolId?: string; page?: number } = {}) =>
    request<Paged<Incident> & { from: string; to: string }>(`/superadmin/operations/incidents?${toQuery(query)}`, {}, token),
  reviewIncident: (token: string, key: string, note: string) =>
    request<void>('/superadmin/operations/incidents/review', { method: 'POST', body: JSON.stringify({ key, note }) }, token),
  securityOverview: (token: string) => request<SecurityOverview>('/superadmin/security/overview', {}, token),
  securitySessions: (token: string) => request<AdminSession[]>('/superadmin/security/sessions', {}, token),
  endAdminSession: (token: string, sessionId: string, reason: string) =>
    request<void>(`/superadmin/security/sessions/${sessionId}/end`, { method: 'POST', body: JSON.stringify({ reason }) }, token),
  securityEvents: (token: string, query: { category: 'logins' | 'changes'; outcome?: string; search?: string; before?: SecurityEvent }) =>
    request<{ entries: SecurityEvent[]; hasMore: boolean }>(`/superadmin/security/events?${toQuery({
      category: query.category, outcome: query.outcome, search: query.search,
      beforeCreatedAt: query.before?.createdAt, beforeId: query.before?.id,
    })}`, {}, token),
  complianceOverview: (token: string) => request<ComplianceOverview>('/superadmin/compliance/overview', {}, token),
  dataRequests: (token: string, query: { status?: string; kind?: string; schoolId?: string; page?: number } = {}) =>
    request<Paged<DataRequest>>(`/superadmin/compliance/data-requests?${toQuery(query)}`, {}, token),
  dataRequest: (token: string, requestId: string) => request<DataRequest & { history: DataRequestEvent[] }>(`/superadmin/compliance/data-requests/${requestId}`, {}, token),
  createDataRequest: (token: string, input: { schoolId: string; kind: 'EXPORT' | 'DELETION'; subjectType: 'STUDENT' | 'PARENT' | 'SCHOOL'; subjectId?: string; requesterName: string; requesterRelationship?: string; receivedVia?: string; details?: string }) =>
    request<DataRequest>('/superadmin/compliance/data-requests', { method: 'POST', body: JSON.stringify(input) }, token),
  setDataRequestStatus: (token: string, requestId: string, status: DataRequestStatus, note?: string) =>
    request<DataRequest>(`/superadmin/compliance/data-requests/${requestId}/status`, { method: 'POST', body: JSON.stringify({ status, note }) }, token),
  downloadDataRequestExport: (token: string, requestId: string) =>
    downloadFile(`/superadmin/compliance/data-requests/${requestId}/export`, token, 'sdpmplus-export.json'),
  runDataRequestDeletion: (token: string, requestId: string, confirmName: string) =>
    request<DataRequest>(`/superadmin/compliance/data-requests/${requestId}/run-deletion`, { method: 'POST', body: JSON.stringify({ confirmName }) }, token),
  setLegalHold: (token: string, schoolId: string, hold: boolean, reason: string) =>
    request<void>(`/superadmin/compliance/schools/${schoolId}/legal-hold`, { method: 'POST', body: JSON.stringify({ hold, reason }) }, token),
  // Notifications & announcements
  notificationSummary: (token: string) => request<{ emailConfigured: boolean; counts: { status: string; day: number; week: number }[] }>('/superadmin/notifications/summary', {}, token),
  notificationDeliveries: (token: string, query: { status?: string; template?: string; search?: string; page?: number } = {}) =>
    request<Paged<EmailDelivery>>(`/superadmin/notifications/deliveries?${toQuery(query)}`, {}, token),
  retryDelivery: (token: string, deliveryId: string) => request<{ sent: boolean }>(`/superadmin/notifications/deliveries/${deliveryId}/retry`, { method: 'POST' }, token),
  announcements: (token: string) => request<Announcement[]>('/superadmin/announcements', {}, token),
  sendAnnouncement: (token: string, input: { title: string; body: string; audience: 'SCHOOL_ADMINS' | 'ALL_STAFF'; schoolIds?: string[] }) =>
    request<{ id: string; schoolCount: number }>('/superadmin/announcements', { method: 'POST', body: JSON.stringify(input) }, token),
  // Reports & background jobs
  reportTypes: (token: string) => request<ReportType[]>('/superadmin/reports', {}, token),
  report: (token: string, type: string, query: { from?: string; to?: string; schoolId?: string; page?: number }) =>
    request<ReportPage>(`/superadmin/reports/${type}?${toQuery(query)}`, {}, token),
  exportReport: (token: string, type: string, input: { from?: string; to?: string; schoolId?: string }) =>
    request<{ jobId: string }>(`/superadmin/reports/${type}/export`, { method: 'POST', body: JSON.stringify(input) }, token),
  myJobs: (token: string) => request<BackgroundJob[]>('/superadmin/jobs', {}, token),
  downloadJob: (token: string, jobId: string) => downloadFile(`/superadmin/jobs/${jobId}/download`, token, 'sdpmplus-report.csv'),
  // Billing
  billingSummary: (token: string) => request<BillingSummary>('/superadmin/billing/summary', {}, token),
  billingPlans: (token: string) => request<BillingPlan[]>('/superadmin/billing/plans', {}, token),
  createPlan: (token: string, input: { name: string; description?: string; pricingModel: 'FLAT' | 'PER_STUDENT'; priceCents: number; interval: 'MONTH' | 'YEAR' }) =>
    request<{ id: string }>('/superadmin/billing/plans', { method: 'POST', body: JSON.stringify(input) }, token),
  updatePlan: (token: string, planId: string, input: { name?: string; description?: string; priceCents?: number; active?: boolean }) =>
    request<void>(`/superadmin/billing/plans/${planId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  subscriptions: (token: string, query: { status?: string; search?: string; page?: number } = {}) =>
    request<Paged<SubscriptionRow>>(`/superadmin/billing/subscriptions?${toQuery(query)}`, {}, token),
  setSubscription: (token: string, schoolId: string, input: { planId: string; status: string; startedOn?: string; currentPeriodEnd?: string; notes?: string }) =>
    request<void>(`/superadmin/billing/schools/${schoolId}/subscription`, { method: 'PUT', body: JSON.stringify(input) }, token),
  schoolBilling: (token: string, schoolId: string) => request<{ subscription: SchoolSubscription | null; invoices: Invoice[] }>(`/superadmin/billing/schools/${schoolId}`, {}, token),
  invoices: (token: string, query: { status?: string; schoolId?: string; page?: number } = {}) =>
    request<Paged<Invoice>>(`/superadmin/billing/invoices?${toQuery(query)}`, {}, token),
  invoice: (token: string, invoiceId: string) => request<Invoice & { payments: Payment[] }>(`/superadmin/billing/invoices/${invoiceId}`, {}, token),
  createInvoice: (token: string, input: { schoolId: string; description?: string; amountCents?: number; periodStart?: string; periodEnd?: string; dueOn?: string }) =>
    request<{ id: string; number: string; amountCents: number }>('/superadmin/billing/invoices', { method: 'POST', body: JSON.stringify(input) }, token),
  issueInvoice: (token: string, invoiceId: string) => request<void>(`/superadmin/billing/invoices/${invoiceId}/issue`, { method: 'POST' }, token),
  voidInvoice: (token: string, invoiceId: string, reason: string) => request<void>(`/superadmin/billing/invoices/${invoiceId}/void`, { method: 'POST', body: JSON.stringify({ reason }) }, token),
  recordPayment: (token: string, invoiceId: string, input: { amountCents: number; method: string; reference?: string; receivedOn?: string }) =>
    request<{ fullyPaid: boolean }>(`/superadmin/billing/invoices/${invoiceId}/payments`, { method: 'POST', body: JSON.stringify(input) }, token),
  systemHealth: (token: string) => request<SystemHealth>('/superadmin/system/health', {}, token),
  checkEmailConnection: (token: string) => request<{ ok: boolean; message: string }>('/superadmin/system/email-check', { method: 'POST' }, token),
  platformAuditActions: (token: string) => request<string[]>('/superadmin/audit-logs/actions', {}, token),
  platformAdmins: (token: string) => request<PlatformAdminRow[]>('/superadmin/admins', {}, token),
  platformAddAdmin: (token: string, input: { email: string; fullName?: string; role: PlatformRole }) =>
    request<{ id: string } & InviteResult>('/superadmin/admins', { method: 'POST', body: JSON.stringify(input) }, token),
  platformUpdateAdmin: (token: string, userId: string, input: { role?: PlatformRole; status?: 'ACTIVE' | 'DISABLED'; reason: string }) =>
    request<void>(`/superadmin/admins/${userId}`, { method: 'PATCH', body: JSON.stringify(input) }, token),
  startSupportSession: (token: string, input: { schoolId: string; reason: string; allowChanges: boolean }) =>
    request<SupportSession>('/superadmin/support-sessions', { method: 'POST', body: JSON.stringify(input) }, token),
  endSupportSession: (token: string) => request<void>('/superadmin/support-sessions/end', { method: 'POST' }, token),
  /** Staff inbox — shared by the admin dashboard's Notices tab and the teacher app's Notices tab. */
  staffNotices: (token: string) =>
    request<(Omit<Notice, 'read'> & { read: number })[]>('/staff/notices', {}, token)
      .then(rows => rows.map(row => ({ ...row, read: Boolean(row.read) }))),
};

export interface SupportSession { id: string; schoolId: string; schoolName: string; reason?: string; allowChanges: boolean; startedAt: number; expiresAt: number }
export interface PlatformMe { role: PlatformRole; permissions: string[]; supportSession: SupportSession | null }
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number }
export type SchoolStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export interface PlatformSchoolRow {
  id: string; name: string; code: string; status: SchoolStatus; createdAt: string; suspendedAt: string | null; suspendedReason: string | null;
  organizationName: string; students: number; staff: number; parents: number; locations: number;
}
export interface PlatformSchoolDetail {
  id: string; name: string; code: string; status: SchoolStatus; timezone: string; createdAt: string;
  suspendedAt: string | null; suspendedReason: string | null; archivedAt: string | null; organizationName: string;
  counts: { students: number; staff: number; parents: number; locations: number };
  locations: { id: string; name: string; address: string | null; status: string; mapped: boolean; geofenceRadius: number | null; startTime: string | null; dismissalTime: string | null; createdAt: string }[];
  admins: { id: string; fullName: string; email: string; accountActive: boolean; status: string; mfaEnabled: boolean; needsSetup: boolean }[];
  activeYear: { id: string; name: string } | null;
  setup: { key: string; label: string; done: boolean }[];
}
export interface PlatformAuditEntry {
  id: string; createdAt: string; schoolId: string | null; schoolName: string | null; actorId: string | null; actorName: string | null; actorRole: string | null;
  action: string; targetType: string | null; targetId: string | null; targetLabel: string | null; details: Record<string, unknown> | null;
  ipAddress: string | null; reason: string | null; requestId: string | null; supportSessionId: string | null;
}
const toQuery = (query: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])).toString();

export interface OperationsSchoolRow {
  id: string; name: string; dropOffs: number; pickUps: number; pendingDropOffs: number; pendingPickUps: number;
  oldestPendingAt: string | null; oldestWaitMinutes: number | null; declined: number;
}
export interface OperationsRequest {
  id: string; schoolId: string; schoolName: string; campusName: string | null; requestType: 'DROP_OFF' | 'PICK_UP'; status: string;
  requestedAt: string; closedAt: string | null; studentName: string; teacherName: string | null; closedByName: string | null; waitMinutes: number | null;
}
export interface OperationsAttendanceRow { id: string; name: string; students: number; present: number; late: number; absent: number; other: number; unmarked: number }
export interface Incident {
  key: string; type: 'REQUEST_DECLINED'; schoolId: string; schoolName: string; occurredAt: string; actorName: string | null;
  studentName: string | null; requestType: 'DROP_OFF' | 'PICK_UP'; reviewNote: string | null; reviewedAt: string | null; reviewedBy: string | null;
}
export interface MfaCoverage { platformAdmins: Coverage; schoolAdmins: Coverage; teachers: Coverage; parents: Coverage }
interface Coverage { total: number; withMfa: number }
export interface SecurityOverview {
  failedDay: number; failedWeek: number; lockoutsDay: number; lockoutsWeek: number; mfaFailuresWeek: number; signInsDay: number;
  adminSessions: number; mfa: MfaCoverage; mfaRequiredForAdmins: boolean;
  suspicious: { targetedAccounts: { identifier: string | null; failures: number; addresses: number }[]; sprayingAddresses: { address: string; failures: number; accounts: number }[] };
}
export interface AdminSession {
  id: string; userId: string; fullName: string; email: string; signedInAt: string; expiresAt: number; platformRole: string | null;
  mfaEnabled: boolean; schools: string | null; inSupportSession: boolean; current: boolean;
}
export interface SecurityEvent {
  id: string; createdAt: string; action: string; actorName: string | null; actorRole: string | null; targetLabel: string | null;
  ipAddress: string | null; reason: string | null; schoolName: string | null; identifier: string | null;
}
export type DataRequestStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
export interface DataRequest {
  id: string; schoolId: string; schoolName: string; kind: 'EXPORT' | 'DELETION'; subjectType: 'STUDENT' | 'PARENT' | 'SCHOOL'; subjectId: string | null;
  subjectLabel: string; requesterName: string; requesterRelationship: string | null; receivedVia: string | null; details: string | null;
  status: DataRequestStatus; statusNote: string | null; dueAt: string; createdAt: string; updatedAt: string; completedAt: string | null;
  outcome: { erased?: Record<string, number>; kept?: string[] } | null; createdBy: string; createdById: string; approvedBy: string | null;
  legalHold: string | null; overdue: boolean;
}
export interface DataRequestEvent { id: string; createdAt: string; action: string; actorName: string | null; actorRole: string | null; reason: string | null; details: Record<string, unknown> | null }
export interface ComplianceOverview {
  requests: { status: DataRequestStatus; kind: 'EXPORT' | 'DELETION'; n: number; overdue: number }[];
  retention: { schoolsWithRetention: number; activeSchools: number; removedStudentsKept: number };
  legalHolds: { id: string; name: string; reason: string; since: string; setBy: string | null }[];
  controls: {
    passwordHashing: string; mfaSecretsEncrypted: boolean; mfaRequiredForAdmins: boolean; httpsEnforced: boolean; databaseTls: boolean;
    auditLogAppendOnly: boolean; auditEntriesLast30Days: number; tenantIsolation: string; emailConfigured: boolean;
  };
  mfa: MfaCoverage;
}
export interface EmailDelivery {
  id: string; channel: string; template: string; recipient: string; subject: string; schoolName: string | null;
  status: 'SENDING' | 'SENT' | 'FAILED' | 'SKIPPED' | 'RETRIED'; error: string | null; retryOf: string | null; createdAt: string;
}
export interface Announcement { id: string; title: string; body: string; audience: 'SCHOOL_ADMINS' | 'ALL_STAFF'; schoolCount: number; createdAt: string; sentBy: string }
export interface ReportType { key: string; title: string; description: string; columns: { key: string; label: string }[] }
export interface ReportPage { from: string; to: string; timezone: string; columns: { key: string; label: string }[]; rows: Record<string, string | number | null>[]; total: number; page: number; pageSize: number }
export interface BackgroundJob {
  id: string; type: string; params: { reportType?: string; query?: { from?: string; to?: string; schoolId?: string } }; status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error: string | null; resultName: string | null; resultSize: number | null; createdAt: string; finishedAt: string | null; createdBy: string | null;
}
export interface BillingPlan { id: string; name: string; description: string | null; pricingModel: 'FLAT' | 'PER_STUDENT'; priceCents: number; currency: string; interval: 'MONTH' | 'YEAR'; active: boolean; schools: number }
export interface SubscriptionRow {
  schoolId: string; schoolName: string; schoolStatus: string; id: string | null; status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'NONE';
  planId: string | null; planName: string | null; pricingModel: string | null; priceCents: number | null; interval: string | null;
  startedOn: string | null; currentPeriodEnd: string | null; notes: string | null; students: number;
}
export interface SchoolSubscription { status: string; startedOn: string; currentPeriodEnd: string | null; notes: string | null; planName: string; pricingModel: string; priceCents: number; interval: string }
export interface Invoice {
  id: string; number: string; schoolId: string; schoolName: string; description: string; amountCents: number; currency: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID'; periodStart: string | null; periodEnd: string | null; dueOn: string | null; issuedAt: string | null;
  paidAt: string | null; voidReason: string | null; createdAt: string; paidCents: number; overdue: boolean;
}
export interface Payment { id: string; amountCents: number; method: string; reference: string | null; receivedOn: string; recordedBy: string | null }
export interface BillingSummary {
  openCents: number; openCount: number; overdueCents: number; overdueCount: number; receivedLast30DaysCents: number;
  subscriptions: Record<string, number>; problems: { id: string; name: string; overdueInvoices: number; overdueCents: number; pastDue: boolean }[];
}
export type HealthStatus = 'ok' | 'degraded' | 'down' | 'not_configured' | 'not_offered' | 'unknown';
export interface SystemHealth {
  generatedAt: string;
  status: HealthStatus;
  api: { status: HealthStatus; version: string; commit: string | null; environment: string; startedAt: string; uptimeMinutes: number; nodeVersion: string; memoryMb: number; eventLoopDelayMs: number };
  database: { status: HealthStatus; message?: string; latencyMs?: number; serverVersion?: string; sizeMb?: number; migrationsApplied?: number; migrationsExpected?: number;
    connections?: { total: number; idle: number; waiting: number }; largestTables?: { name: string; sizeMb: number; approxRows: number }[] };
  email: { status: HealthStatus; sent24h?: number; failed24h?: number; lastSentAt?: string | null };
  sms: { status: HealthStatus };
  push: { status: HealthStatus };
  jobs: { status: HealthStatus; queued?: number; running?: number; failed24h?: number; succeeded24h?: number; oldestQueuedMinutes?: number | null; workerLastTickAt?: string | null; workerRunningHere?: boolean };
  retention: { status: HealthStatus; lastRunAt: string | null; failures: number };
  storage: { databaseMb?: number; exportFilesMb?: number; auditEntriesApprox?: number };
  clients: { client: string; version: string; firstSeen: string; lastSeen: string }[];
  warnings: { setting: string; severity: 'critical' | 'high' | 'medium'; message: string }[];
}
export interface PlatformDashboard {
  timezone: string;
  today: string;
  totals: { totalSchools: number; activeSchools: number; suspendedSchools: number; students: number; parents: number; staff: number; activeUsers: number };
  operations: { dropOffs: number; pickUps: number; pendingDropOffs: number; pendingPickUps: number; declined: number; present: number; absent: number; exceptions: number };
  daily: { date: string; dropOffs: number; pickUps: number; present: number; absent: number; activeSchools: number; signedIn: number }[];
  generatedAt: string;
}
export interface AttentionItem { id: string; severity: 'critical' | 'high' | 'medium' | 'low'; category: string; title: string; detail: string; link: string | null }
export interface PlatformSchoolUser {
  id: string; fullName: string; email: string; phone: string | null; role: string; status: string; accountActive: boolean;
  mfaEnabled: boolean; needsSetup: boolean; lastSignIn: string | null;
}
export interface PlatformSchoolStudent { id: string; fullName: string; status: string; pickupStatus: string; gradeName: string | null; className: string | null }
export interface PlatformSchoolOperations {
  timezone: string;
  today: { dropOffs: number; pickUps: number; pending: number; declined: number };
  recent: { id: string; requestType: 'DROP_OFF' | 'PICK_UP'; status: string; requestedAt: string; approvedAt: string | null; studentName: string; campusName: string | null }[];
}
export interface PlatformSchoolSecurity {
  mfa: { admins: number; adminsWithMfa: number; teachersWithMfa: number };
  lastSevenDays: Record<string, number>;
  supportSessions: { id: string; adminName: string; reason: string; allowChanges: boolean; startedAt: number; endedAt: number | null; expiresAt: number; endReason: string | null }[];
}
export interface PlatformAdminRow { id: string; fullName: string; email: string; role: PlatformRole; status: 'ACTIVE' | 'DISABLED'; createdAt: string; mfaEnabled: boolean; needsSetup: boolean }
export interface AdminOverview { totalStudents: number; activeTeachers: number; presentToday: number; pendingRequests: number }
/** Structured address parts as stored (null when only the legacy one-line `address` exists). */
export interface StoredAddressParts {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}
export interface SchoolBranding {
  id: string;
  name: string;
  logoUrl: string | null;
}
export interface SchoolProfile extends StoredAddressParts {
  id: string;
  name: string;
  code: string;
  logoUrl?: string | null;
  address?: string;
  timezone: string;
  status: string;
  startTime: string | null;
  dismissalTime: string | null;
  extendedTime: string | null;
}
export interface CampusProfile extends StoredAddressParts {
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
  /** Invited but hasn't chosen a password yet. */
  needsSetup?: boolean;
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
  /** Invited but hasn't chosen a password yet. */
  needsSetup?: boolean;
  /** Raw membership role as stored — 'school_admin' is the Admin role, 'staff' is Front Desk / Office Staff. */
  role: 'teacher' | 'school_admin' | 'staff';
  classId?: string;
  className?: string;
}
