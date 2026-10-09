import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api, type OperationsRequest, type Paged } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';
import { LiveControl, REQUEST_TYPE_LABEL, WaitBadge, usePolling } from './live';

/**
 * Operations → Active Requests: every drop-off and pickup still waiting
 * for a teacher, across all schools, longest wait first. Amber after 15
 * minutes, red after 30. Platform admins can see these but not answer
 * them — the school's own staff release children.
 */
export function ActiveRequestsScreen() {
  const { token } = useAuth();
  const [params, setParams] = useSearchParams();
  const schoolId = params.get('schoolId') ?? '';
  const [type, setType] = useState<'' | 'DROP_OFF' | 'PICK_UP'>('');
  const [page, setPage] = useState(1);
  const [live, setLive] = useState(true);
  const [data, setData] = useState<(Paged<OperationsRequest> & { thresholds: { warn: number; alert: number } }) | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api.operationsRequests(token, { state: 'waiting', type: type || undefined, schoolId: schoolId || undefined, page }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load');
      throw err;
    }
  }, [token, type, schoolId, page]);
  const updatedAt = usePolling(load, live);
  const schoolName = schoolId && data?.items[0]?.schoolName;

  return (
    <Screen title="Active Requests" subtitle="Drop-offs and pickups waiting for a teacher, longest wait first.">
      <div className="action-row">
        <label className="field-label" style={{ margin: 0 }}>Type{' '}
          <select className="input" style={{ width: 'auto', display: 'inline-block' }} value={type} onChange={e => { setType(e.target.value as typeof type); setPage(1); }}>
            <option value="">Drop-offs and pickups</option><option value="DROP_OFF">Drop-offs</option><option value="PICK_UP">Pickups</option>
          </select>
        </label>
        {schoolId && (
          <span className="field-label" style={{ margin: 0 }}>
            School: {schoolName || 'selected school'}{' '}
            <button type="button" className="link-button" onClick={() => { setParams({}); setPage(1); }}>Show all schools</button>
          </span>
        )}
      </div>
      <LiveControl live={live} onToggle={() => setLive(v => !v)} updatedAt={updatedAt} />
      {error && <div className="card" role="alert">{error}</div>}
      {!data && !error && <p className="empty-text">Loading…</p>}

      {data && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Waiting</th><th>Requested</th><th>School</th><th>Type</th><th>Student</th><th>Teacher</th></tr></thead>
              <tbody>
                {data.items.map(item => (
                  <tr key={item.id}>
                    <td><WaitBadge minutes={item.waitMinutes} warn={data.thresholds.warn} alert={data.thresholds.alert} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(item.requestedAt)}</td>
                    <td><Link to={`/platform/schools/${item.schoolId}`}>{item.schoolName}</Link>{item.campusName && <div className="field-label" style={{ margin: 0 }}>{item.campusName}</div>}</td>
                    <td>{REQUEST_TYPE_LABEL[item.requestType]}</td>
                    <td>{item.studentName}</td>
                    <td>{item.teacherName ?? 'Not assigned'}</td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={6} className="empty-text">Nothing is waiting.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          <p className="field-label" style={{ margin: 0 }}>Children are shown by first name and last initial. To act on a request, contact the school or open a support session from the school's page.</p>
        </>
      )}
    </Screen>
  );
}
