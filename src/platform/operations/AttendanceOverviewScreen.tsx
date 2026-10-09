import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { SummaryTile } from '../../components/SummaryTile';
import { useAuth } from '../../context/AuthContext';
import { api, type OperationsAttendanceRow, type Paged } from '../../services/api';

/** Operations → Attendance: one day's attendance at every active school (counts only). */
export function AttendanceOverviewScreen() {
  const { token } = useAuth();
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<(Paged<OperationsAttendanceRow> & { date: string; totals: { present: number; absent: number; late: number } }) | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setData(await api.operationsAttendance(token, { date: date || undefined, page }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load attendance');
    }
  }, [token, date, page]);
  useEffect(() => { load(); }, [load]);

  const shownDate = data ? new Date(`${data.date}T12:00:00Z`).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';

  return (
    <Screen title="Attendance" subtitle="Attendance at every school for one day.">
      <label className="field-label" style={{ margin: 0 }} htmlFor="attendance-date">Date</label>
      <input id="attendance-date" className="input" type="date" style={{ maxWidth: 220 }} value={date || data?.date || ''} onChange={e => { setDate(e.target.value); setPage(1); }} />
      {error && <div className="card" role="alert">{error}</div>}
      {!data && !error && <p className="empty-text">Loading…</p>}
      {data && (
        <>
          <p className="form-title" style={{ margin: 0, fontSize: 15 }}>{shownDate}</p>
          <div className="tile-grid tile-grid-wide">
            <SummaryTile label="Present" value={data.totals.present} accentColor="var(--green)" />
            <SummaryTile label="Late (included in present)" value={data.totals.late} accentColor="var(--amber-text)" />
            <SummaryTile label="Absent or sick" value={data.totals.absent} />
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>School</th><th>Students</th><th>Present</th><th>Late</th><th>Absent or sick</th><th>Other</th><th>Not marked</th></tr></thead>
              <tbody>
                {data.items.map(row => (
                  <tr key={row.id}>
                    <td><Link to={`/platform/schools/${row.id}`}>{row.name}</Link></td>
                    <td>{row.students}</td>
                    <td>{row.present}</td>
                    <td>{row.late}</td>
                    <td>{row.absent}</td>
                    <td>{row.other}</td>
                    <td>{row.unmarked}</td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={7} className="empty-text">No active schools.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          <p className="field-label" style={{ margin: 0 }}>"Other" covers holidays, weekends and suspensions. A school that doesn't mark attendance on a day shows everyone as not marked.</p>
        </>
      )}
    </Screen>
  );
}
