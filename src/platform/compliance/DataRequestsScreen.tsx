import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { api, type DataRequest, type Paged, type PlatformSchoolRow } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';
import { DataRequestStatusBadge, KIND_LABEL, SUBJECT_LABEL } from './dataRequestLabels';

type Tab = 'open' | 'all' | 'new';

/**
 * Security & Compliance → Data Requests: export and deletion requests
 * from parents, schools and districts, worked from receipt to completion.
 * Open requests are listed by due date (30 days from receipt).
 */
export function DataRequestsScreen() {
  const { token, can } = useAuth();
  const [tab, setTab] = useState<Tab>('open');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<DataRequest> | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || tab === 'new') return;
    try {
      setData(await api.dataRequests(token, { status: tab === 'open' ? 'OPEN' : undefined, kind: kind || undefined, page }));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load requests');
    }
  }, [token, tab, kind, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <Screen title="Data Requests" subtitle="Export and deletion requests, reviewed before anything is sent or deleted.">
      <div className="subtabs" role="tablist">
        {([['open', 'Open'], ['all', 'All requests'], ...(can('data_request:manage') ? [['new', 'Log a request']] : [])] as [Tab, string][]).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`subtab${tab === key ? ' subtab-active' : ''}`} onClick={() => { setTab(key); setPage(1); }}>{label}</button>
        ))}
      </div>
      {error && <div className="card" role="alert">{error}</div>}

      {tab === 'new' && <NewRequestForm />}

      {tab !== 'new' && (
        <>
          <label className="field-label" style={{ margin: 0 }}>Kind{' '}
            <select className="input" style={{ width: 'auto', display: 'inline-block' }} value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}>
              <option value="">Exports and deletions</option><option value="EXPORT">Exports</option><option value="DELETION">Deletions</option>
            </select>
          </label>
          {!data ? <p className="empty-text">Loading…</p> : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Request</th><th>School</th><th>Requested by</th><th>Status</th><th>Due</th></tr></thead>
                  <tbody>
                    {data.items.map(request => (
                      <tr key={request.id}>
                        <td><Link to={`/platform/compliance/requests/${request.id}`} style={{ fontWeight: 600 }}>{KIND_LABEL[request.kind]}: {request.subjectLabel}</Link><div className="field-label" style={{ margin: 0 }}>{SUBJECT_LABEL[request.subjectType]}</div></td>
                        <td>{request.schoolName}{request.legalHold && <div className="field-label" style={{ margin: 0 }}>On legal hold</div>}</td>
                        <td>{request.requesterName}{request.requesterRelationship && <div className="field-label" style={{ margin: 0 }}>{request.requesterRelationship}</div>}</td>
                        <td><DataRequestStatusBadge status={request.status} /></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {['COMPLETED', 'REJECTED'].includes(request.status) ? '—' : formatUtcTimestamp(request.dueAt).split(',')[0]}
                          {request.overdue && <div style={{ color: 'var(--red)', fontSize: 12, fontWeight: 700 }}>Overdue</div>}
                        </td>
                      </tr>
                    ))}
                    {data.items.length === 0 && <tr><td colSpan={5} className="empty-text">{tab === 'open' ? 'No open requests.' : 'No requests yet.'}</td></tr>}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
            </>
          )}
        </>
      )}
    </Screen>
  );
}

function NewRequestForm() {
  const { token, can } = useAuth();
  const navigate = useNavigate();
  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [form, setForm] = useState({ schoolId: '', kind: 'EXPORT' as 'EXPORT' | 'DELETION', subjectType: 'STUDENT' as 'STUDENT' | 'PARENT' | 'SCHOOL', subjectId: '', requesterName: '', requesterRelationship: '', receivedVia: '', details: '' });
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<{ id: string; label: string }[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm(current => ({ ...current, [key]: value }));

  useEffect(() => { if (token) api.platformSchools(token, { pageSize: 100 }).then(page => setSchools(page.items)).catch(() => {}); }, [token]);

  const findSubject = async () => {
    if (!token || !form.schoolId) return;
    setError('');
    try {
      if (form.subjectType === 'STUDENT') {
        const page = await api.platformSchoolStudents(token, form.schoolId, { search: search.trim() });
        setMatches(page.items.map(s => ({ id: s.id, label: `${s.fullName}${s.gradeName ? ` · ${s.gradeName}` : ''}` })));
      } else {
        const page = await api.platformSchoolUsers(token, form.schoolId, { kind: 'parents', search: search.trim() });
        setMatches(page.items.map(u => ({ id: u.id, label: `${u.fullName} · ${u.email}` })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not search');
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.schoolId || !form.requesterName.trim() || (form.subjectType !== 'SCHOOL' && !form.subjectId)) {
      setError('Choose the school and who the request is about, and enter who asked.');
      return;
    }
    setSaving(true);
    try {
      const created = await api.createDataRequest(token, { ...form, subjectId: form.subjectType === 'SCHOOL' ? undefined : form.subjectId });
      navigate(`/platform/compliance/requests/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the request');
      setSaving(false);
    }
  };

  const canSearchPeople = form.subjectType === 'STUDENT' ? can('student:view') : can('user:view');

  return (
    <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }} onSubmit={submit}>
      <p className="form-title" style={{ margin: 0 }}>Log a data request</p>
      <p className="field-label" style={{ margin: 0 }}>Logging a request changes nothing. It's reviewed and approved before any export is sent or anything is deleted. Target: completed within 30 days.</p>
      <label className="field-label" style={{ margin: 0 }}>School
        <select className="input" value={form.schoolId} onChange={e => { set('schoolId', e.target.value); set('subjectId', ''); setMatches([]); }}>
          <option value="">Choose a school…</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="action-row">
        <legend className="field-label" style={{ marginBottom: 4 }}>Kind</legend>
        {(['EXPORT', 'DELETION'] as const).map(k => (
          <label key={k} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 14 }}>
            <input type="radio" name="kind" checked={form.kind === k} onChange={() => set('kind', k)} /> {k === 'EXPORT' ? 'Export (a copy of the records)' : 'Deletion'}
          </label>
        ))}
      </fieldset>
      <label className="field-label" style={{ margin: 0 }}>About
        <select className="input" value={form.subjectType} onChange={e => { set('subjectType', e.target.value as typeof form.subjectType); set('subjectId', ''); setMatches([]); }}>
          <option value="STUDENT">A student</option><option value="PARENT">A parent or guardian</option><option value="SCHOOL">The whole school</option>
        </select>
      </label>
      {form.subjectType !== 'SCHOOL' && (
        canSearchPeople ? (
          <>
            <div className="action-row">
              <input className="input" style={{ maxWidth: 300 }} aria-label="Search by name" placeholder="Search by name" value={search} onChange={e => setSearch(e.target.value)} disabled={!form.schoolId} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={findSubject} disabled={!form.schoolId}>Find</button>
            </div>
            {matches.length > 0 && (
              <select className="input" aria-label="Choose the person" value={form.subjectId} onChange={e => set('subjectId', e.target.value)}>
                <option value="">Choose…</option>
                {matches.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            )}
          </>
        ) : <p className="field-label" style={{ margin: 0 }}>Your role can't look up people in a school. Ask a platform admin to log this request.</p>
      )}
      <label className="field-label" style={{ margin: 0 }}>Who asked<input className="input" value={form.requesterName} onChange={e => set('requesterName', e.target.value)} /></label>
      <label className="field-label" style={{ margin: 0 }}>Their relationship (e.g. Parent, School principal, District)<input className="input" value={form.requesterRelationship} onChange={e => set('requesterRelationship', e.target.value)} /></label>
      <label className="field-label" style={{ margin: 0 }}>How it was received (e.g. Email to support, Letter from district)<input className="input" value={form.receivedVia} onChange={e => set('receivedVia', e.target.value)} /></label>
      <label className="field-label" style={{ margin: 0 }}>Details (optional)<textarea className="textarea" value={form.details} onChange={e => set('details', e.target.value)} /></label>
      {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
      <div><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Log request'}</button></div>
    </form>
  );
}
