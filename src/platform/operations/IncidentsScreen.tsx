import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { ReasonDialog } from '../../components/ReasonDialog';
import { useAuth } from '../../context/AuthContext';
import { api, type Incident, type Paged } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

const describe = (incident: Incident) => `${incident.requestType === 'DROP_OFF' ? 'Drop-off' : 'Pickup'} request declined`;

/**
 * Operations → Incidents: drop-off and pickup requests that a school's
 * teacher or administrator declined, across all schools. Open ones can
 * be marked reviewed with a note, which is audited.
 */
export function IncidentsScreen() {
  const { token, can } = useAuth();
  const [filters, setFilters] = useState({ from: '', to: '', state: 'open' as 'open' | 'reviewed' | 'all' });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(Paged<Incident> & { from: string; to: string }) | null>(null);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState<Incident | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api.operationsIncidents(token, { ...applied, from: applied.from || undefined, to: applied.to || undefined, page }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load incidents');
    }
  }, [token, applied, page]);
  useEffect(() => { load(); }, [load]);

  const apply = (e: FormEvent) => { e.preventDefault(); setApplied(filters); setPage(1); };
  const confirmReview = async (note: string) => {
    if (!token || !reviewing) return;
    await api.reviewIncident(token, reviewing.key, note);
    setReviewing(null);
    setMessage('Marked as reviewed.');
    await load();
  };

  return (
    <Screen title="Incidents" subtitle="Drop-off and pickup requests that schools declined.">
      <form className="card" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', alignItems: 'end' }} onSubmit={apply}>
        <label className="field-label" style={{ margin: 0 }}>From<input className="input" type="date" value={filters.from || data?.from || ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} /></label>
        <label className="field-label" style={{ margin: 0 }}>To<input className="input" type="date" value={filters.to || data?.to || ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} /></label>
        <label className="field-label" style={{ margin: 0 }}>Status
          <select className="input" value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value as typeof f.state }))}>
            <option value="open">Not reviewed</option><option value="reviewed">Reviewed</option><option value="all">All</option>
          </select>
        </label>
        <div><button type="submit" className="btn btn-primary">Show</button></div>
      </form>
      {message && <div className="card" role="status">{message}</div>}
      {error && <div className="card" role="alert">{error}</div>}
      {!data && !error && <p className="empty-text">Loading…</p>}

      {data && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>School</th><th>What happened</th><th>Student</th><th>Declined by</th><th>Review</th></tr></thead>
              <tbody>
                {data.items.map(incident => (
                  <tr key={incident.key}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(incident.occurredAt)}</td>
                    <td><Link to={`/platform/schools/${incident.schoolId}`}>{incident.schoolName}</Link></td>
                    <td>{describe(incident)}</td>
                    <td>{incident.studentName ?? '—'}</td>
                    <td>{incident.actorName ?? '—'}</td>
                    <td>
                      {incident.reviewedAt
                        ? <span className="field-label" style={{ margin: 0 }}>{incident.reviewedBy}, {formatUtcTimestamp(incident.reviewedAt)}: {incident.reviewNote}</span>
                        : can('incident:review') ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReviewing(incident)}>Mark reviewed</button> : 'Open'}
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={6} className="empty-text">No incidents in this period.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}

      {reviewing && (
        <ReasonDialog
          title="Mark this incident reviewed?"
          message={`${describe(reviewing)} at ${reviewing.schoolName}. Note what you checked or who you spoke to.`}
          fieldLabel="Note (kept in the audit log)"
          confirmLabel="Mark reviewed"
          onConfirm={confirmReview}
          onClose={() => setReviewing(null)}
        />
      )}
    </Screen>
  );
}
