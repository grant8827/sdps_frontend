import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { Pagination } from '../../components/Pagination';
import { SummaryTile } from '../../components/SummaryTile';
import { useAuth } from '../../context/AuthContext';
import { api, type Announcement, type EmailDelivery, type Paged, type PlatformSchoolRow } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

const TEMPLATE_LABEL: Record<string, string> = {
  invite: 'Account invite', addedToSchool: 'Added to a school', passwordReset: 'Password reset link', passwordChanged: 'Password changed alert',
  mfaReset: 'Two-step reset alert', schoolWelcome: 'New school welcome', guardianDecision: 'Guardian decision', guardianApproved: 'Guardian approved',
  notice: 'New message alert',
};
const STATUS_TONE: Record<EmailDelivery['status'], { bg: string; color?: string; label: string }> = {
  SENT: { bg: 'var(--green)', label: 'Sent' },
  FAILED: { bg: 'var(--red)', label: 'Failed' },
  SKIPPED: { bg: 'var(--amber)', color: 'var(--on-amber)', label: 'Not sent (email off)' },
  RETRIED: { bg: '#6B7280', label: 'Retried' },
  SENDING: { bg: 'var(--blue)', label: 'Sending' },
};

type Tab = 'deliveries' | 'announcements';

/**
 * Platform → Notifications: every email SDPMPlus tried to send (sent,
 * failed, or not sent because email isn't set up), with retry, and
 * announcements from SDPMPlus to schools. Links in emails are never
 * stored or shown; retrying an invite or reset sends a fresh link.
 */
export function NotificationsScreen() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>('deliveries');
  return (
    <Screen title="Notifications" subtitle="Email delivery across SDPMPlus, and announcements to schools.">
      <div className="subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'deliveries'} className={`subtab${tab === 'deliveries' ? ' subtab-active' : ''}`} onClick={() => setTab('deliveries')}>Email deliveries</button>
        <button type="button" role="tab" aria-selected={tab === 'announcements'} className={`subtab${tab === 'announcements' ? ' subtab-active' : ''}`} onClick={() => setTab('announcements')}>Announcements</button>
      </div>
      {tab === 'deliveries' ? <Deliveries initialStatus={params.get('status') ?? ''} /> : <Announcements />}
    </Screen>
  );
}

function Deliveries({ initialStatus }: { initialStatus: string }) {
  const { token, can } = useAuth();
  const [summary, setSummary] = useState<{ emailConfigured: boolean; counts: { status: string; day: number; week: number }[] } | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [template, setTemplate] = useState('');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<EmailDelivery> | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const [nextSummary, next] = await Promise.all([api.notificationSummary(token), api.notificationDeliveries(token, { status: status || undefined, template: template || undefined, search: applied || undefined, page })]);
    setSummary(nextSummary);
    setData(next);
  }, [token, status, template, applied, page]);
  useEffect(() => { load().catch(err => setMessage(err.message)); }, [load]);

  const count = (s: string, key: 'day' | 'week') => summary?.counts.find(c => c.status === s)?.[key] ?? 0;
  const retry = async (delivery: EmailDelivery) => {
    if (!token) return;
    try {
      const result = await api.retryDelivery(token, delivery.id);
      setMessage(result.sent ? `Sent again to ${delivery.recipient}.` : `Tried again, but it failed. See the newest entry for ${delivery.recipient}.`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not retry');
    }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); setApplied(search.trim()); setPage(1); };

  return (
    <>
      {summary && !summary.emailConfigured && (
        <div className="card" role="alert"><strong>Email sending isn't set up on the server.</strong> Emails are recorded as "not sent". Set the SMTP_* settings, then retry the ones that matter.</div>
      )}
      <div className="tile-grid tile-grid-wide">
        <SummaryTile label="Sent (24 h)" value={count('SENT', 'day')} accentColor="var(--green)" />
        <SummaryTile label="Failed (24 h)" value={count('FAILED', 'day')} accentColor={count('FAILED', 'day') ? 'var(--red)' : undefined} />
        <SummaryTile label="Not sent, email off (24 h)" value={count('SKIPPED', 'day')} accentColor={count('SKIPPED', 'day') ? 'var(--amber-text)' : undefined} />
        <SummaryTile label="Sent (7 days)" value={count('SENT', 'week')} />
        <SummaryTile label="Failed (7 days)" value={count('FAILED', 'week')} />
      </div>
      <form className="action-row" role="search" onSubmit={submit}>
        <select className="input" style={{ width: 'auto' }} aria-label="Status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="SENT">Sent</option><option value="FAILED">Failed</option><option value="SKIPPED">Not sent (email off)</option><option value="RETRIED">Retried</option>
        </select>
        <select className="input" style={{ width: 'auto' }} aria-label="Kind of email" value={template} onChange={e => { setTemplate(e.target.value); setPage(1); }}>
          <option value="">All kinds</option>
          {Object.entries(TEMPLATE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input className="input" style={{ maxWidth: 240 }} aria-label="Search" placeholder="Recipient or school" value={search} onChange={e => setSearch(e.target.value)} />
        <button type="submit" className="btn btn-secondary btn-sm">Search</button>
      </form>
      {message && <div className="card" role="status">{message}</div>}
      {!data ? <p className="empty-text">Loading…</p> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>Email</th><th>To</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.items.map(delivery => {
                  const tone = STATUS_TONE[delivery.status];
                  return (
                    <tr key={delivery.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(delivery.createdAt)}</td>
                      <td>{TEMPLATE_LABEL[delivery.template] ?? delivery.template}<div className="field-label" style={{ margin: 0 }}>{delivery.subject}</div></td>
                      <td>{delivery.recipient}{delivery.schoolName && <div className="field-label" style={{ margin: 0 }}>{delivery.schoolName}</div>}</td>
                      <td>
                        <span className="pill" style={{ backgroundColor: tone.bg, color: tone.color }}>{tone.label}</span>
                        {delivery.retryOf && <div className="field-label" style={{ margin: '4px 0 0' }}>A retry</div>}
                        {delivery.error && delivery.status === 'FAILED' && <div className="field-label" style={{ margin: '4px 0 0' }}>{delivery.error}</div>}
                      </td>
                      <td>{can('platform:settings') && ['FAILED', 'SKIPPED'].includes(delivery.status) && summary?.emailConfigured && <button type="button" className="btn btn-secondary btn-sm" onClick={() => retry(delivery)}>Retry</button>}</td>
                    </tr>
                  );
                })}
                {data.items.length === 0 && <tr><td colSpan={5} className="empty-text">No emails match.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          <p className="field-label" style={{ margin: 0 }}>Retrying an invite or password email sends a new link; old links are never stored. Text messages and push notifications aren't offered yet.</p>
        </>
      )}
    </>
  );
}

function Announcements() {
  const { token, can } = useAuth();
  const [list, setList] = useState<Announcement[]>([]);
  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [form, setForm] = useState({ title: '', body: '', audience: 'SCHOOL_ADMINS' as 'SCHOOL_ADMINS' | 'ALL_STAFF', everyone: true, schoolIds: [] as string[] });
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => { if (token) api.announcements(token).then(setList).catch(err => setMessage(err.message)); }, [token]);
  useEffect(load, [load]);
  useEffect(() => { if (token && can('platform:settings')) api.platformSchools(token, { status: 'ACTIVE', pageSize: 100 }).then(p => setSchools(p.items)).catch(() => {}); }, [token, can]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.title.trim() || !form.body.trim()) { setMessage('Add a title and a message.'); return; }
    if (!form.everyone && form.schoolIds.length === 0) { setMessage('Choose at least one school.'); return; }
    const target = form.everyone ? `every active school (${schools.length})` : `${form.schoolIds.length} school(s)`;
    if (!window.confirm(`Send "${form.title.trim()}" to ${form.audience === 'ALL_STAFF' ? 'all staff' : 'the administrators'} at ${target}? Each will also get an email alert.`)) return;
    setSending(true);
    try {
      const result = await api.sendAnnouncement(token, { title: form.title.trim(), body: form.body.trim(), audience: form.audience, schoolIds: form.everyone ? undefined : form.schoolIds });
      setMessage(`Sent to ${result.schoolCount} school(s).`);
      setForm(f => ({ ...f, title: '', body: '' }));
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not send');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {message && <div className="card" role="status">{message}</div>}
      {can('platform:settings') && (
        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }} onSubmit={send}>
          <p className="form-title" style={{ margin: 0 }}>New announcement</p>
          <p className="field-label" style={{ margin: 0 }}>Arrives in each school's Messages from "SDPMPlus", with an email alert. Use it for maintenance windows, new features and policy changes.</p>
          <label className="field-label" style={{ margin: 0 }}>Title<input className="input" value={form.title} maxLength={150} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></label>
          <label className="field-label" style={{ margin: 0 }}>Message<textarea className="textarea" value={form.body} maxLength={4000} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></label>
          <label className="field-label" style={{ margin: 0 }}>Send to
            <select className="input" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value as typeof f.audience }))}>
              <option value="SCHOOL_ADMINS">School administrators and front desk</option><option value="ALL_STAFF">All staff, including teachers</option>
            </select>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={form.everyone} onChange={e => setForm(f => ({ ...f, everyone: e.target.checked }))} /> Every active school
          </label>
          {!form.everyone && (
            <select className="input" multiple size={Math.min(8, Math.max(3, schools.length))} aria-label="Schools" value={form.schoolIds}
              onChange={e => setForm(f => ({ ...f, schoolIds: Array.from(e.target.selectedOptions).map(o => o.value) }))}>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <div><button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send announcement'}</button></div>
        </form>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Sent</th><th>Announcement</th><th>To</th><th>By</th></tr></thead>
          <tbody>
            {list.map(a => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(a.createdAt)}</td>
                <td><strong>{a.title}</strong><div className="field-label" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{a.body}</div></td>
                <td>{a.audience === 'ALL_STAFF' ? 'All staff' : 'Administrators'} at {a.schoolCount} school(s)</td>
                <td>{a.sentBy}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={4} className="empty-text">No announcements yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
