import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { InviteResult } from '../components/InviteResult';
import { useAuth } from '../context/AuthContext';
import { api, type InviteResult as InviteResultData, type Paged, type PlatformSchoolRow } from '../services/api';
import { formatUtcTimestamp } from '../utils/utcTime';

type Tab = 'all' | 'suspended' | 'add';
const PAGE_SIZE = 25;
const emptyForm = { name: '', campusName: '', campusAddress: '', adminFullName: '', adminEmail: '' };

/**
 * Platform → Schools: every school on SDPMPlus (search, status, sort,
 * pages), suspended ones on their own tab, and Add School — which also
 * invites the school's first administrator by email.
 */
export function SchoolsScreen() {
  const { token, can } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'suspended' ? 'suspended' : 'all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<PlatformSchoolRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState<{ id: string; name: string; result: InviteResultData } | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveStatus = tab === 'suspended' ? 'SUSPENDED' : status;
  const load = useCallback(async () => {
    if (!token || tab === 'add') return;
    setLoading(true);
    try {
      const [field, dir] = sort === 'newest' ? ['created', 'desc' as const] : sort === 'oldest' ? ['created', 'asc' as const] : ['name', 'asc' as const];
      setData(await api.platformSchools(token, { search: query, status: effectiveStatus, sort: field, dir, page, pageSize: PAGE_SIZE }));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load schools');
    } finally {
      setLoading(false);
    }
  }, [token, tab, query, effectiveStatus, sort, page]);
  useEffect(() => { load(); }, [load]);

  const switchTab = (next: Tab) => { setTab(next); setPage(1); };
  const submitSearch = (e: FormEvent) => { e.preventDefault(); setPage(1); setQuery(search.trim()); };
  const set = (key: keyof typeof emptyForm, value: string) => setForm(current => ({ ...current, [key]: value }));

  const createSchool = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.name.trim() || !form.adminFullName.trim() || !form.adminEmail.trim()) { setMessage("School name and the administrator's name and email are required."); return; }
    setSaving(true);
    setMessage('');
    try {
      const result = await api.platformCreateSchool(token, {
        name: form.name.trim(), campusName: form.campusName.trim() || undefined, campusAddress: form.campusAddress.trim() || undefined,
        adminFullName: form.adminFullName.trim(), adminEmail: form.adminEmail.trim(),
      });
      setCreated({ id: result.id, name: form.name.trim(), result });
      setForm(emptyForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the school');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Schools" subtitle="Every school on SDPMPlus.">
      <div className="subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'all'} className={`subtab${tab === 'all' ? ' subtab-active' : ''}`} onClick={() => switchTab('all')}>All Schools</button>
        <button type="button" role="tab" aria-selected={tab === 'suspended'} className={`subtab${tab === 'suspended' ? ' subtab-active' : ''}`} onClick={() => switchTab('suspended')}>Suspended</button>
        {can('school:create') && <button type="button" role="tab" aria-selected={tab === 'add'} className={`subtab${tab === 'add' ? ' subtab-active' : ''}`} onClick={() => switchTab('add')}>Add School</button>}
      </div>
      {message && <div className="card" role="alert">{message}</div>}

      {tab === 'add' && (
        <>
          {created && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0 }}><strong>{created.name}</strong> was created.</p>
              <InviteResult name="the administrator" result={created.result} />
              <div><button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/platform/schools/${created.id}`)}>Open school</button></div>
            </div>
          )}
          <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }} onSubmit={createSchool}>
            <p className="form-title" style={{ margin: 0 }}>New school</p>
            <label className="field-label" style={{ margin: 0 }} htmlFor="school-name">School name</label>
            <input id="school-name" className="input" value={form.name} onChange={e => set('name', e.target.value)} />
            <label className="field-label" style={{ margin: 0 }} htmlFor="campus-name">First location name (optional)</label>
            <input id="campus-name" className="input" placeholder="Main Campus" value={form.campusName} onChange={e => set('campusName', e.target.value)} />
            <label className="field-label" style={{ margin: 0 }} htmlFor="campus-address">Location address (optional; the school can map it in School Setup)</label>
            <input id="campus-address" className="input" value={form.campusAddress} onChange={e => set('campusAddress', e.target.value)} />
            <p className="form-title" style={{ margin: '8px 0 0', fontSize: 15 }}>First administrator</p>
            <label className="field-label" style={{ margin: 0 }} htmlFor="admin-name">Full name</label>
            <input id="admin-name" className="input" value={form.adminFullName} onChange={e => set('adminFullName', e.target.value)} />
            <label className="field-label" style={{ margin: 0 }} htmlFor="admin-email">Email</label>
            <input id="admin-email" className="input" type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} />
            <p className="field-label" style={{ margin: 0 }}>They get an email to choose their own password, and set up two-step verification when they first sign in.</p>
            <div><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create School'}</button></div>
          </form>
        </>
      )}

      {tab !== 'add' && (
        <>
          <form className="btn-row" style={{ alignItems: 'flex-end', gap: 8 }} onSubmit={submitSearch} role="search">
            <div style={{ flex: '1 1 220px' }}>
              <label className="field-label" style={{ margin: '0 0 4px', display: 'block' }} htmlFor="school-search">Search by name or code</label>
              <input id="school-search" className="input" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab === 'all' && (
              <div style={{ flex: '0 1 160px' }}>
                <label className="field-label" style={{ margin: '0 0 4px', display: 'block' }} htmlFor="school-status">Status</label>
                <select id="school-status" className="input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
                  <option value="">Any</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="ARCHIVED">Archived</option>
                </select>
              </div>
            )}
            <div style={{ flex: '0 1 160px' }}>
              <label className="field-label" style={{ margin: '0 0 4px', display: 'block' }} htmlFor="school-sort">Sort</label>
              <select id="school-sort" className="input" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }}>
                <option value="name">Name</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              </select>
            </div>
            <button type="submit" className="btn btn-secondary">Search</button>
          </form>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>School</th><th>Status</th><th>Students</th><th>Staff</th><th>Parents</th><th>Locations</th><th>Added</th></tr>
              </thead>
              <tbody>
                {data?.items.map(school => (
                  <tr key={school.id}>
                    <td>
                      <Link to={`/platform/schools/${school.id}`} style={{ fontWeight: 600 }}>{school.name}</Link>
                      <div className="field-label" style={{ margin: 0 }}>Code {school.code}</div>
                    </td>
                    <td>
                      <StatusBadge status={school.status} />
                      {school.suspendedReason && <div className="field-label" style={{ margin: '4px 0 0' }}>{school.suspendedReason}</div>}
                    </td>
                    <td>{school.students}</td>
                    <td>{school.staff}</td>
                    <td>{school.parents}</td>
                    <td>{school.locations}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(school.createdAt).split(',')[0]}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && (
                  <tr><td colSpan={7} className="empty-text">{query ? `No school matches "${query}".` : tab === 'suspended' ? 'No suspended schools.' : 'No schools yet.'}</td></tr>
                )}
                {!data && loading && <tr><td colSpan={7} className="empty-text">Loading…</td></tr>}
              </tbody>
            </table>
          </div>
          {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
        </>
      )}
    </Screen>
  );
}
