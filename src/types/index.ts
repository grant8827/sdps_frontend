/**
 * Shared domain types for the School Drop-off & Pick-up app.
 * Ported from mobile_app/src/types so the website and the app agree
 * on shape — both are meant to eventually talk to the same Node API.
 */

export type Role = 'parent' | 'teacher' | 'admin';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  /**
   * Per-school roles from the login response — 'school_admin', 'staff'
   * (front desk), 'teacher', 'parent', 'platform_super_admin', or
   * 'district_admin' (one entry per school in their district).
   */
  memberships?: { schoolId: string; role: string; schoolName?: string; districtName?: string | null }[];
  /** Set for platform administrators (people who run SDPMPlus itself). The API re-checks it on every call. */
  platform?: { role: PlatformRole; permissions: string[] } | null;
}

export type PlatformRole = 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'SUPPORT_ADMIN' | 'BILLING_ADMIN';

/**
 * What sign-in returns when the password was right but a second step is
 * owed: enter an authenticator code (mfaRequired), or — for an account
 * that must use two-step verification and hasn't set it up — enroll
 * first (mfaSetupRequired). mfaToken identifies this half-finished sign-in.
 */
export interface MfaChallenge {
  mfaRequired?: boolean;
  mfaSetupRequired?: boolean;
  mfaToken: string;
}
export type LoginResult = AuthSession | MfaChallenge;
export const isMfaChallenge = (result: LoginResult): result is MfaChallenge => 'mfaToken' in result;

export interface AuthSession {
  token: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  user: User;
}

/** Per-child status shown on the Parent Drop-off/Pick-up screen. */
export type ChildStatus =
  | 'AT_HOME'
  | 'DROPOFF_REQUESTED'
  | 'PRESENT'
  | 'PICKUP_REQUESTED'
  | 'PICKED_UP';

export interface Child {
  id: string;
  fullName: string;
  photoUrl?: string;
  parentId?: string;
  teacherId: string;
  teacherName?: string;
  gradeName?: string;
  className?: string;
  status: ChildStatus;
  daycare?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadius?: number | null;
}

export interface Parent {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  childIds: string[];
}

export interface Teacher {
  id: string;
  fullName: string;
  email: string;
  roomName: string;
  studentIds: string[];
}

/** Mon-Fri attendance status per day, keyed by ISO date. */
export type DailyAttendanceStatus = 'PRESENT' | 'ABSENT' | 'PENDING';

export interface AttendanceRecord {
  childId: string;
  date: string; // ISO yyyy-mm-dd
  status: DailyAttendanceStatus;
}

/** A single item on the teacher's live queue. */
export type QueueRequestType = 'DROP_OFF' | 'PICK_UP';

export interface QueueItem {
  id: string;
  childId: string;
  childName: string;
  childPhotoUrl?: string;
  className?: string;
  parentName: string;
  teacherId: string;
  requestType: QueueRequestType;
  requestedAt: string; // ISO timestamp
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  senderName: string;
  senderRole: Role;
  createdAt: string; // ISO timestamp
  read: boolean;
}
