import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pagination } from '../components/Pagination';
import { StatusBadge } from '../components/StatusBadge';
import { SummaryTile } from '../components/SummaryTile';
import { TrendChart } from '../components/charts/TrendChart';
import { useAuth } from '../context/AuthContext';
import {
  api, type Paged, type PlatformSchoolDetail, type PlatformSchoolOperations, type PlatformSchoolSecurity,
  type PlatformSchoolStudent, type PlatformSchoolUser,
} from '../services/api';
import { formatUtcTimestamp } from '../utils/utcTime';
import { formatMoney } from '../utils/money';
import { Link } from 'react-router-dom';
import { InvoiceBadge } from './billing/InvoicesScreen';
import { SUBSCRIPTION_LABEL } from './billing/SubscriptionsScreen';

// The fuller tabs of Platform → School. Each loads only when opened, and
// viewing people or children is recorded in the school's own audit log.

const ROLE_NAMES: Record<string, string> = { teacher: 'Teacher', school_admin: 'Administrator', staff: 'Front desk', parent: 'Parent / guardian' };

function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const run = useCallback(() => {
    loader().then(value => { setData(value); setError(''); }).catch(err => setError(err instanceof Error ? err.message : 'Could not load'));
  }, [loader]);
  useEffect(() => { run(); }, [run]);
  return { data, error, reload: run };
}

const Loading = ({ error }: { error: string }) => (error ? <div className="card" role="alert">{error}</div> : <p className="empty-text">Loading…</p>);

function SearchBox({ label, onSearch }: { label: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); onSearch(value.trim()); };
  return (
    <form className="action-row" role="search" onSubmit={submit}>
      <input className="input" style={{ maxWidth: 320 }} aria-label={label} placeholder={label} value={value} onChange={e => setValue(e.target.value)} />
      <button type="submit" className="btn btn-secondary btn-sm">Search</button>
    </form>
  );
}

/** Staff or parents of the school: role, status, two-step, last sign-in. Never credentials. */
export function UsersTab({ schoolId, kind }: { schoolId: string; kind: 'staff' | 'parents' }) {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const loader = useCallback(() => api.platformSchoolUsers(token!, schoolId, { kind, search, page }), [token, schoolId, kind, search, page]);
  const { data, error } = useLoad<Paged<PlatformSchoolUser>>(loader);
  return (
    <>
      <SearchBox label={`Search ${kind === 'staff' ? 'staff' : 'parents'} by name or email`} onSearch={value => { setSearch(value); setPage(1); }} />
      {!data ? <Loading error={error} /> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Two-step</th><th>Last sign-in</th></tr></thead>
              <tbody>
                {data.items.map(user => (
                  <tr key={user.id}>
                    <td>{user.fullName}<div className="field-label" style={{ margin: 0 }}>{[user.email, user.phone].filter(Boolean).join(' · ')}</div></td>
                    <td>{ROLE_NAMES[user.role] ?? user.role}</td>
                    <td><StatusBadge status={user.accountActive ? user.status : 'DISABLED'} />{user.needsSetup && <div className="field-label" style={{ margin: '4px 0 0' }}>Invited, not set up</div>}</td>
                    <td>{user.mfaEnabled ? 'On' : 'Off'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{user.lastSignIn ? formatUtcTimestamp(user.lastSignIn) : 'Never'}</td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={5} className="empty-text">{search ? `No one matches "${search}".` : 'No one yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}

/** Students: name, grade/class and status only — enough for support, nothing more. */
export function StudentsTab({ schoolId }: { schoolId: string }) {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const loader = useCallback(() => api.platformSchoolStudents(token!, schoolId, { search, page }), [token, schoolId, search, page]);
  const { data, error } = useLoad<Paged<PlatformSchoolStudent>>(loader);
  return (
    <>
      <p className="field-label" style={{ margin: 0 }}>Shown for support only: name, grade, class and status. Viewing this list is recorded in the school's audit log.</p>
      <SearchBox label="Search students by name" onSearch={value => { setSearch(value); setPage(1); }} />
      {!data ? <Loading error={error} /> : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Student</th><th>Grade</th><th>Class</th><th>Enrollment</th></tr></thead>
              <tbody>
                {data.items.map(student => (
                  <tr key={student.id}>
                    <td>{student.fullName}</td>
                    <td>{student.gradeName ?? '—'}</td>
                    <td>{student.className ?? '—'}</td>
                    <td><StatusBadge status={student.status} /></td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={4} className="empty-text">{search ? `No student matches "${search}".` : 'No students yet.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}

const REQUEST_LABEL = { DROP_OFF: 'Drop-off', PICK_UP: 'Pickup' };
const STATUS_LABEL: Record<string, string> = { PENDING: 'Waiting', APPROVED: 'Done', CANCELLED: 'Cancelled', DECLINED: 'Declined' };

export function OperationsTab({ schoolId }: { schoolId: string }) {
  const { token } = useAuth();
  const loader = useCallback(() => api.platformSchoolOperations(token!, schoolId), [token, schoolId]);
  const { data, error } = useLoad<PlatformSchoolOperations>(loader);
  if (!data) return <Loading error={error} />;
  return (
    <>
      <div className="tile-grid tile-grid-wide">
        <SummaryTile label="Drop-offs today" value={data.today.dropOffs} accentColor="var(--blue)" />
        <SummaryTile label="Pickups today" value={data.today.pickUps} accentColor="var(--blue)" />
        <SummaryTile label="Waiting now" value={data.today.pending} accentColor="var(--amber-text)" />
        <SummaryTile label="Declined today" value={data.today.declined} accentColor={data.today.declined ? 'var(--amber-text)' : undefined} />
      </div>
      <p className="form-title" style={{ margin: '4px 0 0', fontSize: 15 }}>Latest requests</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Requested</th><th>Type</th><th>Student</th><th>Status</th></tr></thead>
          <tbody>
            {data.recent.map(item => (
              <tr key={item.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(item.requestedAt)}</td>
                <td>{REQUEST_LABEL[item.requestType]}{item.campusName && <div className="field-label" style={{ margin: 0 }}>{item.campusName}</div>}</td>
                <td>{item.studentName}</td>
                <td>{STATUS_LABEL[item.status] ?? item.status}</td>
              </tr>
            ))}
            {data.recent.length === 0 && <tr><td colSpan={4} className="empty-text">No drop-off or pickup requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AttendanceTab({ schoolId }: { schoolId: string }) {
  const { token } = useAuth();
  const loader = useCallback(() => api.platformSchoolAttendance(token!, schoolId), [token, schoolId]);
  const { data, error } = useLoad(loader);
  if (!data) return <Loading error={error} />;
  const today = data.days.at(-1);
  return (
    <>
      <div className="tile-grid tile-grid-wide">
        <SummaryTile label="Active students" value={data.students} />
        <SummaryTile label="Present today" value={today?.present ?? 0} accentColor="var(--green)" />
        <SummaryTile label="Absent or sick today" value={today?.absent ?? 0} />
        <SummaryTile label="Not marked today" value={Math.max(0, data.students - (today ? today.present + today.absent + today.other : 0))} accentColor="var(--amber-text)" />
      </div>
      <TrendChart title="Attendance, last 14 days" data={data.days} series={[{ key: 'present', label: 'Present', color: '#39A844' }, { key: 'absent', label: 'Absent or sick', color: '#F5B82E' }]} />
    </>
  );
}

/** The rules every school runs under today (the same for every school; per-school settings come later). */
export function PickupRulesTab({ school }: { school: PlatformSchoolDetail }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p className="form-title" style={{ margin: 0 }}>Pickup rules</p>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, fontSize: 14 }}>
        <li>A parent can request drop-off or pickup only from within each location's pickup radius ({school.locations.map(l => `${l.name}: ${l.mapped ? `${l.geofenceRadius ?? 150} m` : 'not mapped yet'}`).join('; ') || 'no locations'}).</li>
        <li>Only an adult the school has authorized for that child can request a pickup.</li>
        <li>A pickup is released when the child's teacher or a school administrator confirms it. Every release is recorded with who confirmed it.</li>
        <li>An adult added by a parent can't drop off or pick up until the school approves them.</li>
        <li>Drop-off and pickup are paused at a suspended location.</li>
      </ul>
    </div>
  );
}

export function NotificationsTab({ schoolId }: { schoolId: string }) {
  const { token } = useAuth();
  const loader = useCallback(() => api.platformSchoolNotifications(token!, schoolId), [token, schoolId]);
  const { data, error } = useLoad(loader);
  if (!data) return <Loading error={error} />;
  const count = (key: string) => data.lastThirtyDays[key] ?? 0;
  return (
    <>
      <div className="card">
        <strong>Email: </strong>{data.emailConfigured ? 'Sending is set up for the platform.' : "Email sending isn't set up for the platform, so this school's invites, resets and message alerts aren't being emailed."}
        <p className="field-label" style={{ margin: '6px 0 0' }}>Delivery tracking (sent / failed per email) and SMS or push notifications aren't available yet.</p>
      </div>
      <div className="tile-grid tile-grid-wide">
        <SummaryTile label="To all parents (30 days)" value={count('SCHOOL')} />
        <SummaryTile label="To a class (30 days)" value={count('CLASS')} />
        <SummaryTile label="To one parent (30 days)" value={count('PARENT')} />
        <SummaryTile label="To staff (30 days)" value={count('STAFF')} />
        <SummaryTile label="To the office (30 days)" value={count('ADMIN')} />
      </div>
    </>
  );
}

export function PlaceholderTab({ title, text }: { title: string; text: string }) {
  return (
    <div className="card">
      <p className="form-title" style={{ margin: 0 }}>{title}</p>
      <p style={{ margin: '6px 0 0', fontSize: 14 }}>{text}</p>
    </div>
  );
}

const EVENT_LABELS: [string, string][] = [
  ['SIGN_IN_FAILED', 'Failed sign-ins'], ['SIGN_IN_LOCKED_OUT', 'Sign-in lockouts'], ['MFA_CODE_FAILED', 'Wrong two-step codes'],
  ['MFA_RESET', 'Two-step resets'], ['PASSWORD_RESET', 'Password resets by email'], ['PICKUP_PIN_LOCKED_OUT', 'Pickup PIN lockouts'],
];

export function SecurityTab({ schoolId }: { schoolId: string }) {
  const { token } = useAuth();
  const loader = useCallback(() => api.platformSchoolSecurity(token!, schoolId), [token, schoolId]);
  const { data, error } = useLoad<PlatformSchoolSecurity>(loader);
  if (!data) return <Loading error={error} />;
  const time = (ms: number) => new Date(ms).toLocaleString();
  return (
    <>
      <div className="tile-grid tile-grid-wide">
        <SummaryTile label="Admins & front desk with two-step" value={`${data.mfa.adminsWithMfa} of ${data.mfa.admins}`} accentColor={data.mfa.adminsWithMfa < data.mfa.admins ? 'var(--amber-text)' : 'var(--green)'} />
        <SummaryTile label="Teachers with two-step" value={data.mfa.teachersWithMfa} />
        {EVENT_LABELS.map(([key, label]) => <SummaryTile key={key} label={`${label} (7 days)`} value={data.lastSevenDays[key] ?? 0} />)}
      </div>
      <p className="form-title" style={{ margin: '4px 0 0', fontSize: 15 }}>Support sessions into this school</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Started</th><th>By</th><th>Reason</th><th>Access</th><th>Ended</th></tr></thead>
          <tbody>
            {data.supportSessions.map(session => (
              <tr key={session.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{time(session.startedAt)}</td>
                <td>{session.adminName}</td>
                <td>{session.reason}</td>
                <td>{session.allowChanges ? 'Changes allowed' : 'Read-only'}</td>
                <td>{session.endedAt ? `${time(session.endedAt)}${session.endReason ? ` (${session.endReason.toLowerCase().replace('_', ' ')})` : ''}` : session.expiresAt < Date.now() ? 'Expired' : 'Open now'}</td>
              </tr>
            ))}
            {data.supportSessions.length === 0 && <tr><td colSpan={5} className="empty-text">No support sessions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** The school's plan and invoices (Billing). */
export function SubscriptionTab({ schoolId }: { schoolId: string }) {
  const { token } = useAuth();
  const loader = useCallback(() => api.schoolBilling(token!, schoolId), [token, schoolId]);
  const { data, error } = useLoad(loader);
  if (!data) return <Loading error={error} />;
  const sub = data.subscription;
  return (
    <>
      <div className="card" style={{ display: 'grid', gap: 6, fontSize: 14 }}>
        {sub ? (
          <>
            <div><strong>{sub.planName}</strong> · {formatMoney(sub.priceCents)}{sub.pricingModel === 'PER_STUDENT' ? ' per student' : ''} / {sub.interval === 'YEAR' ? 'year' : 'month'}</div>
            <div>Status: {SUBSCRIPTION_LABEL[sub.status as keyof typeof SUBSCRIPTION_LABEL] ?? sub.status} · since {sub.startedOn}{sub.currentPeriodEnd && ` · current period ends ${sub.currentPeriodEnd}`}</div>
            {sub.notes && <div className="field-label" style={{ margin: 0 }}>{sub.notes}</div>}
          </>
        ) : <div>No plan set. <Link to="/platform/billing/subscriptions">Set one in School Subscriptions</Link>.</div>}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Invoice</th><th>Amount</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>
            {data.invoices.map(invoice => (
              <tr key={invoice.id}>
                <td><Link to={`/platform/billing/invoices/${invoice.id}`}>{invoice.number}</Link><div className="field-label" style={{ margin: 0 }}>{invoice.description}</div></td>
                <td>{formatMoney(invoice.amountCents, invoice.currency)}</td>
                <td>{formatMoney(invoice.paidCents, invoice.currency)}</td>
                <td>{invoice.dueOn ?? '—'}</td>
                <td><InvoiceBadge invoice={invoice} /></td>
              </tr>
            ))}
            {data.invoices.length === 0 && <tr><td colSpan={5} className="empty-text">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
