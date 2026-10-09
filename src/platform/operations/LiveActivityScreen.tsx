import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api, type OperationsRequest, type OperationsSchoolRow, type Paged } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';
import { LiveControl, REQUEST_TYPE_LABEL, WaitBadge, usePolling } from './live';

type Tab = 'schools' | 'DROP_OFF' | 'PICK_UP';

/**
 * Operations → Live Activity: every active school's day so far (done,
 * waiting, longest wait, declined), and the drop-offs and pickups
 * finished today, refreshing every 10 seconds.
 */
export function LiveActivityScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('schools');
  const [live, setLive] = useState(true);
  const [page, setPage] = useState(1);
  const [schools, setSchools] = useState<(Paged<OperationsSchoolRow> & { timezone: string }) | null>(null);
  const [done, setDone] = useState<Paged<OperationsRequest> | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      if (tab === 'schools') setSchools(await api.operationsSchools(token, { page }));
      else setDone(await api.operationsRequests(token, { state: 'done', type: tab, page }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load');
      throw err;
    }
  }, [token, tab, page]);
  const updatedAt = usePolling(load, live);
  const switchTab = (next: Tab) => { setTab(next); setPage(1); };

  return (
    <Screen title="Live Activity" subtitle="Today's drop-offs and pickups across every school.">
      <div className="subtabs" role="tablist">
        {([['schools', 'By school'], ['DROP_OFF', 'Drop-offs today'], ['PICK_UP', 'Pickups today']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`subtab${tab === key ? ' subtab-active' : ''}`} onClick={() => switchTab(key)}>{label}</button>
        ))}
      </div>
      <LiveControl live={live} onToggle={() => setLive(v => !v)} updatedAt={updatedAt} />
      {error && <div className="card" role="alert">{error}</div>}

      {tab === 'schools' && schools && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>School</th><th>Drop-offs done</th><th>Pickups done</th><th>Waiting</th><th>Longest wait</th><th>Declined today</th></tr></thead>
              <tbody>
                {schools.items.map(school => (
                  <tr key={school.id}>
                    <td><Link to={`/platform/schools/${school.id}`}>{school.name}</Link></td>
                    <td>{school.dropOffs}</td>
                    <td>{school.pickUps}</td>
                    <td>
                      {school.pendingDropOffs + school.pendingPickUps > 0
                        ? <Link to={`/platform/operations/requests?schoolId=${school.id}`}>{school.pendingDropOffs} drop-off, {school.pendingPickUps} pickup</Link>
                        : 'None'}
                    </td>
                    <td><WaitBadge minutes={school.oldestWaitMinutes} warn={15} alert={30} /></td>
                    <td>{school.declined}</td>
                  </tr>
                ))}
                {schools.items.length === 0 && <tr><td colSpan={6} className="empty-text">No active schools.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={schools.page} pageSize={schools.pageSize} total={schools.total} onPage={setPage} />
          <p className="field-label" style={{ margin: 0 }}>"Today" is in {schools.timezone.replace('_', ' ')} time. Schools with the longest wait are listed first.</p>
        </>
      )}

      {tab !== 'schools' && done && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Finished</th><th>School</th><th>Student</th><th>Outcome</th><th>By</th></tr></thead>
              <tbody>
                {done.items.map(item => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{item.closedAt ? formatUtcTimestamp(item.closedAt) : '—'}</td>
                    <td>{item.schoolName}{item.campusName && <div className="field-label" style={{ margin: 0 }}>{item.campusName}</div>}</td>
                    <td>{item.studentName}</td>
                    <td>{item.status === 'DECLINED' ? 'Declined' : item.status === 'CANCELLED' ? 'Cancelled' : `${REQUEST_TYPE_LABEL[item.requestType]} done`}</td>
                    <td>{item.closedByName ?? '—'}</td>
                  </tr>
                ))}
                {done.items.length === 0 && <tr><td colSpan={5} className="empty-text">None yet today.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={done.page} pageSize={done.pageSize} total={done.total} onPage={setPage} />
        </>
      )}
      {((tab === 'schools' && !schools) || (tab !== 'schools' && !done)) && !error && <p className="empty-text">Loading…</p>}
    </Screen>
  );
}
