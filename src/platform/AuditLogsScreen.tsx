import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { api, type PlatformAuditEntry, type PlatformSchoolRow } from '../services/api';
import { ROLE_LABELS, actionLabel } from '../utils/auditLabels';
import { formatUtcTimestamp } from '../utils/utcTime';

function formatDetails(entry: PlatformAuditEntry) {
  const parts = Object.entries(entry.details ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`);
  if (entry.ipAddress) parts.push(`IP: ${entry.ipAddress}`);
  return parts.join(' · ');
}

const emptyFilters = { schoolId: '', action: '', actor: '', from: '', to: '' };

/**
 * Platform → Audit Logs: the permanent record across every school (and
 * platform-level actions with no school). Filter by school, action,
 * person and date; newest first, 50 at a time.
 */
export function AuditLogsScreen() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ ...emptyFilters, schoolId: params.get('schoolId') ?? '', action: params.get('action') ?? '' });
  const [applied, setApplied] = useState(filters);
  const [entries, setEntries] = useState<PlatformAuditEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api.platformAuditActions(token).then(setActions).catch(() => {});
    api.platformSchools(token, { pageSize: 100, sort: 'name' }).then(page => setSchools(page.items)).catch(() => {});
  }, [token]);

  const load = useCallback(async (before?: PlatformAuditEntry) => {
    if (!token) return;
    setLoading(true);
    try {
      const page = await api.platformAuditLogs(token, { ...applied, before });
      setEntries(current => (before ? [...current, ...page.entries] : page.entries));
      setHasMore(page.hasMore);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the audit log');
    } finally {
      setLoading(false);
    }
  }, [token, applied]);
  useEffect(() => { load(); }, [load]);

  const set = (key: keyof typeof emptyFilters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const apply = (e: FormEvent) => { e.preventDefault(); setApplied(filters); };

  return (
    <Screen title="Audit Logs" subtitle="Every school's record of sensitive actions, plus platform actions. Entries can't be edited or deleted.">
      <form className="card" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', alignItems: 'end' }} onSubmit={apply}>
        <label className="field-label" style={{ margin: 0 }}>School
          <select className="input" value={filters.schoolId} onChange={e => set('schoolId', e.target.value)}>
            <option value="">All schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field-label" style={{ margin: 0 }}>Action
          <select className="input" value={filters.action} onChange={e => set('action', e.target.value)}>
            <option value="">All actions</option>
            {actions.map(a => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
        </label>
        <label className="field-label" style={{ margin: 0 }}>Person
          <input className="input" placeholder="Name" value={filters.actor} onChange={e => set('actor', e.target.value)} />
        </label>
        <label className="field-label" style={{ margin: 0 }}>From
          <input className="input" type="date" value={filters.from} onChange={e => set('from', e.target.value)} />
        </label>
        <label className="field-label" style={{ margin: 0 }}>To
          <input className="input" type="date" value={filters.to} onChange={e => set('to', e.target.value)} />
        </label>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={loading}>Search</button>
          <button type="button" className="btn btn-secondary" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); }}>Clear</button>
        </div>
      </form>
      {message && <div className="card" role="alert">{message}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>When</th><th>School</th><th>Who</th><th>Action</th><th>About</th><th>Details</th></tr></thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(entry.createdAt)}</td>
                <td>{entry.schoolName ?? <span className="field-label">Platform</span>}</td>
                <td>{entry.actorName ?? '—'}{entry.actorRole && <div className="field-label" style={{ margin: 0 }}>{ROLE_LABELS[entry.actorRole] ?? entry.actorRole}</div>}</td>
                <td>
                  {actionLabel(entry.action)}
                  {entry.supportSessionId && <div className="field-label" style={{ margin: 0 }}>In a support session</div>}
                </td>
                <td>{entry.targetLabel ?? '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                  {entry.reason && <div><strong>Reason:</strong> {entry.reason}</div>}
                  {formatDetails(entry) || (!entry.reason && '—')}
                </td>
              </tr>
            ))}
            {entries.length === 0 && !loading && <tr><td colSpan={6} className="empty-text">No entries match.</td></tr>}
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
