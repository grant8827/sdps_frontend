import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api, type BackgroundJob, type PlatformSchoolRow, type ReportPage, type ReportType } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

const JOB_STATUS: Record<BackgroundJob['status'], string> = { QUEUED: 'Waiting to start', RUNNING: 'Preparing…', SUCCEEDED: 'Ready', FAILED: 'Failed' };

/**
 * Platform → Reports: pick a report, a date range (up to a year) and
 * optionally one school; preview it on screen, or export the full
 * report as a CSV file prepared in the background. Counts only — no
 * report lists individual children.
 */
export function ReportsScreen() {
  const { token } = useAuth();
  const [types, setTypes] = useState<ReportType[]>([]);
  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [type, setType] = useState('school-usage');
  const [filters, setFilters] = useState({ from: '', to: '', schoolId: '' });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReportPage | null>(null);
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.reportTypes(token).then(setTypes).catch(err => setMessage(err.message));
    api.platformSchools(token, { pageSize: 100 }).then(p => setSchools(p.items)).catch(() => {});
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setData(await api.report(token, type, { from: applied.from || undefined, to: applied.to || undefined, schoolId: applied.schoolId || undefined, page }));
      setMessage('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not run the report');
    } finally {
      setLoading(false);
    }
  }, [token, type, applied, page]);
  useEffect(() => { load(); }, [load]);

  // Recent exports, checked every 3 seconds while one is still being prepared.
  const loadJobs = useCallback(() => { if (token) api.myJobs(token).then(setJobs).catch(() => {}); }, [token]);
  useEffect(loadJobs, [loadJobs]);
  const pending = jobs.some(j => j.status === 'QUEUED' || j.status === 'RUNNING');
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    if (!pending) return;
    timer.current = setInterval(loadJobs, 3000);
    return () => clearInterval(timer.current);
  }, [pending, loadJobs]);

  const run = (e: FormEvent) => { e.preventDefault(); setApplied(filters); setPage(1); };
  const exportCsv = async () => {
    if (!token) return;
    try {
      await api.exportReport(token, type, { from: applied.from || data?.from, to: applied.to || data?.to, schoolId: applied.schoolId || undefined });
      setMessage('Export started. It appears under "Your exports" below when it\'s ready.');
      loadJobs();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not start the export');
    }
  };
  const download = async (job: BackgroundJob) => {
    if (!token) return;
    try { await api.downloadJob(token, job.id); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not download'); }
  };
  const current = types.find(t => t.key === type);

  return (
    <Screen title="Reports" subtitle="Platform-wide counts by school and day. Export any report as a spreadsheet (CSV).">
      <form className="card" style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', alignItems: 'end' }} onSubmit={run}>
        <label className="field-label" style={{ margin: 0 }}>Report
          <select className="input" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
            {types.map(t => <option key={t.key} value={t.key}>{t.title}</option>)}
          </select>
        </label>
        <label className="field-label" style={{ margin: 0 }}>From<input className="input" type="date" value={filters.from || data?.from || ''} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} /></label>
        <label className="field-label" style={{ margin: 0 }}>To<input className="input" type="date" value={filters.to || data?.to || ''} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} /></label>
        <label className="field-label" style={{ margin: 0 }}>School
          <select className="input" value={filters.schoolId} onChange={e => setFilters(f => ({ ...f, schoolId: e.target.value }))}>
            <option value="">All schools</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <div className="action-row">
          <button type="submit" className="btn btn-primary" disabled={loading}>Run</button>
          <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={!data}>Export CSV</button>
        </div>
      </form>
      {current && <p className="field-label" style={{ margin: 0 }}>{current.description}{data && ` Dates are in ${data.timezone.replace('_', ' ')} time.`}</p>}
      {message && <div className="card" role="status">{message}</div>}

      {data && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr>{data.columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {data.rows.map((row, i) => <tr key={i}>{data.columns.map(c => <td key={c.key}>{row[c.key] ?? '—'}</td>)}</tr>)}
                {data.rows.length === 0 && <tr><td colSpan={data.columns.length} className="empty-text">No data for this period.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="form-title" style={{ margin: 0, fontSize: 15 }}>Your exports</h2>
        <p className="field-label" style={{ margin: 0 }}>Kept for 7 days. Only you can download your exports.</p>
        {jobs.length === 0 ? <p className="empty-text">No exports yet.</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Requested</th><th>Report</th><th>Period</th><th>Status</th><th /></tr></thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(job.createdAt)}</td>
                    <td>{types.find(t => t.key === job.params.reportType)?.title ?? job.params.reportType}</td>
                    <td>{job.params.query?.from ?? '…'} to {job.params.query?.to ?? 'today'}</td>
                    <td>{JOB_STATUS[job.status]}{job.error && job.status === 'FAILED' && <div className="field-label" style={{ margin: 0 }}>{job.error}</div>}</td>
                    <td>{job.status === 'SUCCEEDED' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => download(job)}>Download{job.resultSize ? ` (${Math.max(1, Math.round(job.resultSize / 1024))} KB)` : ''}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Screen>
  );
}
