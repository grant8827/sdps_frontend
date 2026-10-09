import type { DataRequestStatus } from '../../services/api';

export const KIND_LABEL = { EXPORT: 'Export', DELETION: 'Deletion' } as const;
export const SUBJECT_LABEL = { STUDENT: 'Student', PARENT: 'Parent or guardian', SCHOOL: 'Whole school' } as const;
export const STATUS_LABEL: Record<DataRequestStatus, string> = {
  REQUESTED: 'Requested', UNDER_REVIEW: 'Under review', APPROVED: 'Approved', PROCESSING: 'Processing', COMPLETED: 'Completed', REJECTED: 'Rejected',
};

// Amber while waiting on someone, blue while being carried out, green when done, grey when rejected.
const TONE: Record<DataRequestStatus, { bg: string; color?: string }> = {
  REQUESTED: { bg: 'var(--amber)', color: 'var(--on-amber)' },
  UNDER_REVIEW: { bg: 'var(--amber)', color: 'var(--on-amber)' },
  APPROVED: { bg: 'var(--blue)' },
  PROCESSING: { bg: 'var(--blue)' },
  COMPLETED: { bg: 'var(--green)' },
  REJECTED: { bg: '#6B7280' },
};

export function DataRequestStatusBadge({ status }: { status: DataRequestStatus }) {
  return <span className="pill" style={{ backgroundColor: TONE[status].bg, color: TONE[status].color }}>{STATUS_LABEL[status]}</span>;
}
