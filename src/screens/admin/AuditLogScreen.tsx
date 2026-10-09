import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type AuditEntry } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';
import { ROLE_LABELS, actionLabel } from '../../utils/auditLabels';

const label = actionLabel;


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
