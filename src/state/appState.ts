import {
  mockAttendance,
  mockChildren,
  mockNotices,
  mockParents,
  mockTeachers,
} from '../mocks/mockData';
import { realtimeService } from '../services/realtime';
import type {
  AttendanceRecord,
  Child,
  Notice,
  Parent,
  QueueItem,
  Teacher,
} from '../types';

/**
 * In-memory application state, shared across every screen/role within
 * one running app instance. Stands in for the backend database until
 * the real API exists. Ported from mobile_app/src/state/appState so
 * the website behaves identically to the app.
 *
 * Actions mutate one shared store and emit on the RealtimeService (for
 * anything currently mounted and listening), and every screen also
 * reads the current store state on mount — so logging out as Parent
 * after a drop-off and logging back in as Teacher still shows the
 * pending request.
 *
 * Caveat: this only shares state within ONE browser tab/process. Real
 * cross-device sync (a parent's phone -> a different teacher's laptop)
 * needs the actual backend + transport.
 */

let children: Child[] = [...mockChildren];
let attendance: AttendanceRecord[] = [...mockAttendance];
let queue: QueueItem[] = [];
let notices: Notice[] = [...mockNotices];
let teachers: Teacher[] = [...mockTeachers];
let parents: Parent[] = [...mockParents];

const todayIso = () => new Date().toISOString().slice(0, 10);

// --- Reads ---

export function getChildrenForParent(parentId: string): Child[] {
  return children.filter(c => c.parentId === parentId);
}

export function getChildrenForTeacher(teacherId: string): Child[] {
  return children.filter(c => c.teacherId === teacherId);
}

export function getAllChildren(): Child[] {
  return children;
}

export function getAttendanceFor(childId: string, date: string): AttendanceRecord | undefined {
  return attendance.find(a => a.childId === childId && a.date === date);
}

export function getQueueForTeacher(teacherId: string): QueueItem[] {
  return queue.filter(q => q.teacherId === teacherId);
}

export function getAllQueue(): QueueItem[] {
  return queue;
}

export function getAllAttendanceForDate(date: string): AttendanceRecord[] {
  return attendance.filter(a => a.date === date);
}

export function getNotices(): Notice[] {
  return notices;
}

export function getTeachers(): Teacher[] {
  return teachers;
}

export function getParents(): Parent[] {
  return parents;
}

// --- Actions (parent drop-off/pick-up) ---

export function requestDropOff(child: Child, parentName: string): void {
  children = children.map(c => (c.id === child.id ? { ...c, status: 'DROPOFF_REQUESTED' } : c));
  const item: QueueItem = {
    id: `${child.id}-dropoff-${Date.now()}`,
    childId: child.id,
    childName: child.fullName,
    parentName,
    teacherId: child.teacherId,
    requestType: 'DROP_OFF',
    requestedAt: new Date().toISOString(),
  };
  queue = [item, ...queue];
  realtimeService.emit('queue:new-request', item);
}

export function requestPickUp(child: Child, parentName: string): void {
  children = children.map(c => (c.id === child.id ? { ...c, status: 'PICKUP_REQUESTED' } : c));
  const item: QueueItem = {
    id: `${child.id}-pickup-${Date.now()}`,
    childId: child.id,
    childName: child.fullName,
    parentName,
    teacherId: child.teacherId,
    requestType: 'PICK_UP',
    requestedAt: new Date().toISOString(),
  };
  queue = [item, ...queue];
  realtimeService.emit('queue:new-request', item);
}

// --- Actions (teacher approves -> queue clears + attendance marks) ---

export function approveQueueItem(item: QueueItem): void {
  queue = queue.filter(q => q.id !== item.id);

  children = children.map(c =>
    c.id === item.childId
      ? { ...c, status: item.requestType === 'DROP_OFF' ? 'PRESENT' : 'PICKED_UP' }
      : c,
  );

  realtimeService.emit('queue:request-approved', {
    queueItemId: item.id,
    childId: item.childId,
  });

  if (item.requestType === 'DROP_OFF') {
    const record: AttendanceRecord = {
      childId: item.childId,
      date: todayIso(),
      status: 'PRESENT',
    };
    attendance = [
      ...attendance.filter(a => !(a.childId === record.childId && a.date === record.date)),
      record,
    ];
    realtimeService.emit('attendance:updated', record);
  }
}

// --- Actions (notices) ---

export function postNotice(notice: Notice): void {
  notices = [notice, ...notices];
  realtimeService.emit('notice:posted', notice);
}

// --- Actions (admin faculty/family management) ---

export function addTeacher(teacher: Teacher): void {
  teachers = [...teachers, teacher];
}

export function updateTeacher(id: string, patch: Partial<Teacher>): void {
  teachers = teachers.map(t => (t.id === id ? { ...t, ...patch } : t));
}

export function addParent(parent: Parent): void {
  parents = [...parents, parent];
}
