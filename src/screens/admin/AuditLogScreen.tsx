import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type AuditEntry } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

const ACTION_LABELS: Record<string, string> = {
  SIGNED_IN: 'Signed in',
  SIGN_IN_FAILED: 'Failed sign-in',
  SIGN_IN_LOCKED_OUT: 'Sign-in locked out',
  PASSWORD_CHANGED: 'Changed password',
  MFA_ENABLED: 'Turned on two-step verification',
  MFA_DISABLED: 'Turned off two-step verification',
  MFA_CODE_FAILED: 'Wrong two-step code',
  MFA_RECOVERY_CODES_REPLACED: 'Replaced recovery codes',
  MFA_RESET: 'Reset two-step verification',
  SCHOOL_ADDED_TO_DISTRICT: 'School added to district',
  DISTRICT_ADMIN_ADDED: 'District admin added',
  DISTRICT_ADMIN_REMOVED: 'District admin removed',
  SCHOOL_REGISTERED: 'Registered school',
  DROPOFF_REQUESTED: 'Requested drop-off',
  PICKUP_REQUESTED: 'Requested pickup',
  DROPOFF_ACCEPTED: 'Accepted drop-off',
  PICKUP_ACCEPTED: 'Accepted pickup',
  DROPOFF_DECLINED: 'Declined drop-off',
  PICKUP_DECLINED: 'Declined pickup',
  PICKUP_CODE_REJECTED: 'Wrong pickup code entered',
  PICKUP_CODE_LOCKED_OUT: 'Pickup cancelled (too many wrong codes)',
  CLASS_ROSTER_VIEWED: 'Viewed class roster',
  ATTENDANCE_HISTORY_VIEWED: 'Viewed attendance history',
  ATTENDANCE_VIEWED: 'Viewed attendance',
  ATTENDANCE_MARKED: 'Marked attendance',
  STUDENT_LIST_VIEWED: 'Viewed student list',
  PARENT_LIST_VIEWED: 'Viewed parent list',
  STUDENT_CREATED: 'Added student',
  STUDENT_STATUS_CHANGED: 'Changed student status',
  STUDENT_REMOVED: 'Removed student',
  STUDENT_RESTORED: 'Restored student',
  STUDENT_RECORD_EXPORTED: "Exported a student's record",
  STUDENT_PERMANENTLY_DELETED: 'Permanently deleted student',
  SCHOOL_DATA_EXPORTED: 'Exported school data',
  RETENTION_SETTINGS_CHANGED: 'Changed retention settings',
  PICKUP_HISTORY_PURGED: 'Deleted old drop-off/pickup records',
  PICKUP_AUTHORIZATION_CHANGED: 'Changed pickup authorization',
  PICKUP_AUTHORIZATION_REQUESTED: 'Asked to authorize an adult',
  PICKUP_AUTHORIZATION_APPROVED: 'Approved an adult',
  PICKUP_AUTHORIZATION_REJECTED: 'Rejected an adult',
  PARENT_CREATED: 'Added parent',
  PARENT_STATUS_CHANGED: 'Changed parent status',
  PARENT_REMOVED: 'Removed parent',
  STAFF_CREATED: 'Added staff member',
  STAFF_UPDATED: 'Edited staff member',
  STAFF_STATUS_CHANGED: 'Changed staff status',
  STAFF_REMOVED: 'Removed staff member',
  SCHOOL_SETTINGS_UPDATED: 'Changed school settings',
  LOCATION_CREATED: 'Added location',
  LOCATION_UPDATED: 'Changed location',
  CLASS_CREATED: 'Added class',
  PROMOTION_RUN: 'Ran grade promotion',
  SCHOOL_YEAR_ACTIVATED: 'Activated school year',
};
const ROLE_LABELS: Record<string, string> = {
  school_admin: 'Admin', staff: 'Front Desk', teacher: 'Teacher', parent: 'Parent', admin: 'Admin', platform_super_admin: 'Platform Admin', system: 'Automatic',
  district_admin: 'District Admin', platform_operator: 'Platform Operator',
};
const label = (action: string) => ACTION_LABELS[action] ?? action;


function formatDetails(entry: AuditEntry) {
  const parts = Object.entries(entry.details ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  if (entry.ipAddress) parts.push(`IP: ${entry.ipAddress}`);
  return parts.join(' · ');
}

/**
 * Admin Audit Log: read-only, newest-first history of sensitive actions
 * in this school — who viewed student lists, changed pickup
 * authorization, accepted a pickup, changed a record, signed in (or
 * failed to). Entries can't be edited or deleted, by anyone. School
 * admins only; front desk staff don't get this tab.
 */
export function AuditLogScreen() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async (before?: AuditEntry) => {
    if (!token) return;
    setLoading(true);
    try {
      const page = await api.auditLog(token, { action: action || undefined, before });
      setEntries(current => (before ? [...current, ...page.entries] : page.entries));
      setActions(page.actions);
      setHasMore(page.hasMore);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the audit log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token, action]);

  return (
    <Screen title="Audit Log" subtitle="A permanent record of sensitive actions in this school. Entries can't be edited or deleted.">
      <div className="btn-row" style={{ alignItems: 'flex-end', gap: 8 }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <p className="field-label" style={{ margin: '0 0 4px' }}>Action</p>
          <select className="input" value={action} onChange={e => setAction(e.target.value)}>
            <option value="">All actions</option>
            {actions.map(a => <option key={a} value={a}>{label(a)}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => load()} disabled={loading}>Refresh</button>
      </div>
      {message && <div className="card">{message}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>When</th><th>Who</th><th>Action</th><th>About</th><th>Details</th></tr>
          </thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(entry.createdAt)}</td>
                <td>
                  {entry.actorName ?? '—'}
                  {entry.actorRole && <div className="field-label" style={{ margin: 0 }}>{ROLE_LABELS[entry.actorRole] ?? entry.actorRole}</div>}
                </td>
                <td>{label(entry.action)}</td>
                <td>{entry.targetLabel ?? '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-word' }}>{formatDetails(entry) || '—'}</td>
              </tr>
            ))}
            {entries.length === 0 && !loading && <tr><td colSpan={5} className="empty-text">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <button type="button" className="btn btn-secondary" onClick={() => load(entries[entries.length - 1])} disabled={loading}>
          {loading ? 'Loading…' : 'Load older entries'}
        </button>
      )}
    </Screen>
  );
}
