import type { GuardianRequestStatus } from '../services/api';

const STATUS_STYLE: Record<GuardianRequestStatus, { label: string; color: string }> = {
  PENDING: { label: 'Waiting for school', color: 'var(--amber)' },
  APPROVED: { label: 'Approved', color: 'var(--green)' },
  REJECTED: { label: 'Not approved', color: 'var(--red)' },
};

/** Status badge for a guardian authorization request — shared by the parent and admin screens. */
export function GuardianRequestStatusPill({ status }: { status: GuardianRequestStatus }) {
  const { label, color } = STATUS_STYLE[status];
  return <span className="pill" style={{ backgroundColor: color }}>{label}</span>;
}
