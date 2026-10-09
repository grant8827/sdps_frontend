import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Screen } from '../../components/Screen';
import { SummaryTile } from '../../components/SummaryTile';
import { ReasonDialog } from '../../components/ReasonDialog';
import { useAuth } from '../../context/AuthContext';
import { api, type AdminSession, type MfaCoverage, type SecurityEvent, type SecurityOverview } from '../../services/api';
import { ROLE_LABELS, actionLabel } from '../../utils/auditLabels';
import { formatUtcTimestamp } from '../../utils/utcTime';

type Tab = 'overview' | 'logins' | 'changes' | 'sessions';

const COVERAGE_GROUPS: [keyof MfaCoverage, string][] = [
  ['platformAdmins', 'Platform administrators'], ['schoolAdmins', 'School admins & front desk'], ['teachers', 'Teachers'], ['parents', 'Parents'],
];

/** Two-step coverage as "12 of 15 (80%)", amber when an admin group isn't fully covered. */
export function MfaCoverageTiles({ mfa }: { mfa: MfaCoverage }) {
  return (
    <div className="tile-grid tile-grid-wide">
      {COVERAGE_GROUPS.map(([key, label]) => {
        const { total, withMfa } = mfa[key];
        const pct = total ? Math.round((withMfa / total) * 100) : 100;
        const adminGroup = key === 'platformAdmins' || key === 'schoolAdmins';
        return <SummaryTile key={key} label={`${label} with two-step`} value={`${withMfa} of ${total} (${pct}%)`} accentColor={adminGroup && withMfa < total ? 'var(--amber-text)' : undefined} />;
      })}
    </div>
  );
}

/**
 * Security & Compliance → Security Center: failed sign-ins and lockouts,
 * suspicious patterns, two-step verification coverage, sign-in activity,
 * recent security changes, and who holds an admin session right now
 * (with a way to end one). Never shows passwords, tokens or secrets.
 */
export function SecurityCenterScreen() {
  const { token, can } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) api.securityOverview(token).then(setOverview).catch(err => setError(err.message));
  }, [token]);

  return (
    <Screen title="Security Center" subtitle="Sign-in activity, two-step verification and admin sessions across SDPMPlus.">
      <div className="subtabs subtabs-wrap" role="tablist">
        {([['overview', 'Overview'], ['logins', 'Sign-in Activity'], ['changes', 'Security Changes'], ['sessions', 'Admin Sessions']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`subtab${tab === key ? ' subtab-active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      {error && <div className="card" role="alert">{error}</div>}

      {tab === 'overview' && (overview ? (
        <>
          <div className="tile-grid tile-grid-wide">
            <SummaryTile label="Failed sign-ins (24 h)" value={overview.failedDay} accentColor={overview.failedDay ? 'var(--amber-text)' : undefined} />
            <SummaryTile label="Failed sign-ins (7 days)" value={overview.failedWeek} />
            <SummaryTile label="Lockouts (24 h)" value={overview.lockoutsDay} accentColor={overview.lockoutsDay ? 'var(--red)' : undefined} />
            <SummaryTile label="Lockouts (7 days)" value={overview.lockoutsWeek} />
            <SummaryTile label="Wrong two-step codes (7 days)" value={overview.mfaFailuresWeek} />
            <SummaryTile label="Successful sign-ins (24 h)" value={overview.signInsDay} accentColor="var(--green)" />
            <SummaryTile label="People with an admin session now" value={overview.adminSessions} accentColor="var(--blue)" />
          </div>
          <p className="form-title" style={{ margin: '4px 0 0', fontSize: 15 }}>Two-step verification</p>
          <p className="field-label" style={{ margin: 0 }}>
            {overview.mfaRequiredForAdmins ? 'Required for every administrator and platform role.' : 'Warning: the requirement for administrators is switched off on this server (REQUIRE_ADMIN_MFA=false).'} Optional for teachers and parents.
          </p>
          <MfaCoverageTiles mfa={overview.mfa} />

          <p className="form-title" style={{ margin: '4px 0 0', fontSize: 15 }}>Suspicious activity (24 h)</p>
          {overview.suspicious.targetedAccounts.length === 0 && overview.suspicious.sprayingAddresses.length === 0 && <p style={{ margin: 0 }}>Nothing unusual.</p>}
          {overview.suspicious.targetedAccounts.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Account name tried</th><th>Failed attempts</th><th>From addresses</th></tr></thead>
                <tbody>{overview.suspicious.targetedAccounts.map(row => <tr key={row.identifier ?? 'unknown'}><td>{row.identifier ?? 'unknown'}</td><td>{row.failures}</td><td>{row.addresses}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          {overview.suspicious.sprayingAddresses.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Address trying many accounts</th><th>Failed attempts</th><th>Different accounts</th></tr></thead>
                <tbody>{overview.suspicious.sprayingAddresses.map(row => <tr key={row.address}><td>{row.address}</td><td>{row.failures}</td><td>{row.accounts}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      ) : !error && <p className="empty-text">Loading…</p>)}

      {(tab === 'logins' || tab === 'changes') && <EventsTab key={tab} category={tab} />}
      {tab === 'sessions' && <SessionsTab canEnd={can('user:disable')} />}
    </Screen>
  );
}

function EventsTab({ category }: { category: 'logins' | 'changes' }) {
  const { token } = useAuth();
  const [outcome, setOutcome] = useState('');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState({ outcome: '', search: '' });
  const [entries, setEntries] = useState<SecurityEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (before?: SecurityEvent) => {
    if (!token) return;
    setLoading(true);
    try {
      const page = await api.securityEvents(token, { category, outcome: applied.outcome || undefined, search: applied.search || undefined, before });
      setEntries(current => (before ? [...current, ...page.entries] : page.entries));
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  }, [token, category, applied]);
  useEffect(() => { load().catch(() => {}); }, [load]);
  const submit = (e: FormEvent) => { e.preventDefault(); setApplied({ outcome, search: search.trim() }); };

  return (
    <>
      <form className="action-row" role="search" onSubmit={submit}>
        {category === 'logins' && (
          <select className="input" style={{ width: 'auto' }} aria-label="Outcome" value={outcome} onChange={e => setOutcome(e.target.value)}>
            <option value="">All sign-ins</option><option value="success">Successful</option><option value="failed">Failed</option><option value="locked">Locked out</option>
          </select>
        )}
        <input className="input" style={{ maxWidth: 280 }} aria-label="Search" placeholder="Name, email or IP address" value={search} onChange={e => setSearch(e.target.value)} />
        <button type="submit" className="btn btn-secondary btn-sm">Search</button>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>When</th><th>What</th><th>Who</th><th>School</th><th>{category === 'logins' ? 'IP address' : 'Details'}</th></tr></thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(entry.createdAt)}</td>
                <td>{actionLabel(entry.action)}</td>
                <td>
                  {entry.actorName ?? entry.identifier ?? '—'}
                  {entry.actorRole && <div className="field-label" style={{ margin: 0 }}>{ROLE_LABELS[entry.actorRole] ?? entry.actorRole}</div>}
                  {entry.targetLabel && entry.targetLabel !== entry.actorName && <div className="field-label" style={{ margin: 0 }}>about {entry.targetLabel}</div>}
                </td>
                <td>{entry.schoolName ?? <span className="field-label">Platform</span>}</td>
                <td style={{ fontSize: 13 }}>{category === 'logins' ? entry.ipAddress ?? '—' : entry.reason ?? '—'}</td>
              </tr>
            ))}
            {entries.length === 0 && !loading && <tr><td colSpan={5} className="empty-text">Nothing to show.</td></tr>}
          </tbody>
        </table>
      </div>
      {hasMore && <button type="button" className="btn btn-secondary" onClick={() => load(entries[entries.length - 1])} disabled={loading}>{loading ? 'Loading…' : 'Load older'}</button>}
    </>
  );
}

function SessionsTab({ canEnd }: { canEnd: boolean }) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);
  const [ending, setEnding] = useState<AdminSession | null>(null);
  const [message, setMessage] = useState('');
  const load = useCallback(() => { if (token) api.securitySessions(token).then(setSessions).catch(err => setMessage(err.message)); }, [token]);
  useEffect(load, [load]);

  const confirmEnd = async (reason: string) => {
    if (!token || !ending) return;
    await api.endAdminSession(token, ending.id, reason);
    setMessage(`${ending.fullName} was signed out of that session.`);
    setEnding(null);
    load();
  };

  return (
    <>
      <p className="field-label" style={{ margin: 0 }}>Everyone signed in with administrator or platform access. Ending a session signs that browser or phone out right away.</p>
      {message && <div className="card" role="status">{message}</div>}
      {!sessions ? <p className="empty-text">Loading…</p> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Person</th><th>Access</th><th>Signed in</th><th>Session ends</th><th>Two-step</th><th /></tr></thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id}>
                  <td>{session.fullName}{session.current && ' (this session)'}<div className="field-label" style={{ margin: 0 }}>{session.email}</div></td>
                  <td>
                    {session.platformRole ? ROLE_LABELS[session.platformRole] ?? session.platformRole : 'School admin'}
                    {session.schools && <div className="field-label" style={{ margin: 0 }}>{session.schools}</div>}
                    {session.inSupportSession && <div className="field-label" style={{ margin: 0 }}>In a support session</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(session.signedInAt)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(session.expiresAt).toLocaleString()}</td>
                  <td>{session.mfaEnabled ? 'On' : 'Off'}</td>
                  <td>{canEnd && !session.current && <button type="button" className="btn btn-danger btn-sm" onClick={() => setEnding(session)}>End session</button>}</td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><td colSpan={6} className="empty-text">No admin sessions right now.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {ending && (
        <ReasonDialog
          title={`End ${ending.fullName}'s session?`}
          message="They're signed out of that browser or phone immediately and must sign in again (with two-step verification if they use it)."
          confirmLabel="End session"
          danger
          onConfirm={confirmEnd}
          onClose={() => setEnding(null)}
        />
      )}
    </>
  );
}
