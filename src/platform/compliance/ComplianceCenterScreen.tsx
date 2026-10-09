import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { SummaryTile } from '../../components/SummaryTile';
import { ReasonDialog } from '../../components/ReasonDialog';
import { useAuth } from '../../context/AuthContext';
import { api, type ComplianceOverview, type PlatformSchoolRow } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';
import { MfaCoverageTiles } from '../security/SecurityCenterScreen';

const POLICIES: [string, string][] = [
  ['privacy-policy', 'Privacy Policy'],
  ['student-data-privacy', 'Student Data Privacy'],
  ['data-processing-agreement', 'Data Processing Agreement'],
  ['data-retention', 'Data Retention & Deletion'],
  ['subprocessors', 'Vendors & Subprocessors'],
  ['security', 'Security'],
  ['incident-response', 'Incident Response'],
];

function Check({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="check-row">
      <span className={`check-mark ${ok ? 'ok' : 'warn'}`} aria-hidden>{ok ? '✓' : '!'}</span>
      <span><strong>{label}</strong>{detail && <span className="field-label" style={{ display: 'block', margin: 0 }}>{detail}</span>}</span>
      <span className="sr-only">{ok ? 'In place' : 'Needs attention'}</span>
    </li>
  );
}

/**
 * Security & Compliance → Compliance Center: the operational picture for
 * student-data privacy — data requests, retention, legal holds, the
 * security controls the server can check about itself, and the policies.
 * It reports facts; it doesn't claim any certification.
 */
export function ComplianceCenterScreen() {
  const { token, can } = useAuth();
  const [data, setData] = useState<ComplianceOverview | null>(null);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [holdSchoolId, setHoldSchoolId] = useState('');
  const [dialog, setDialog] = useState<{ schoolId: string; name: string; hold: boolean } | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(() => { if (token) api.complianceOverview(token).then(setData).catch(err => setError(err.message)); }, [token]);
  useEffect(load, [load]);
  useEffect(() => {
    if (token && can('legal_hold:manage')) api.platformSchools(token, { pageSize: 100, status: 'ACTIVE' }).then(page => setSchools(page.items)).catch(() => {});
  }, [token, can]);

  if (!data) return <Screen title="Compliance Center">{error ? <div className="card" role="alert">{error}</div> : <p className="empty-text">Loading…</p>}</Screen>;
  const count = (filter: (r: ComplianceOverview['requests'][number]) => boolean) => data.requests.filter(filter).reduce((sum, r) => sum + r.n, 0);
  const open = count(r => !['COMPLETED', 'REJECTED'].includes(r.status));
  const overdue = data.requests.reduce((sum, r) => sum + r.overdue, 0);
  const c = data.controls;

  const confirmHold = async (reason: string) => {
    if (!token || !dialog) return;
    await api.setLegalHold(token, dialog.schoolId, dialog.hold, reason);
    setMessage(dialog.hold ? `${dialog.name} is on legal hold. Nothing there can be permanently deleted.` : `Legal hold released for ${dialog.name}.`);
    setDialog(null);
    setHoldSchoolId('');
    load();
  };

  return (
    <Screen title="Compliance Center" subtitle="Student-data privacy operations: requests, retention, holds and controls. This is an operational view, not a certification.">
      {message && <div className="card" role="status">{message}</div>}

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="form-title" style={{ margin: 0 }}>Data requests</h2>
        <div className="tile-grid tile-grid-wide">
          <SummaryTile label="Open requests" value={open} accentColor={open ? 'var(--amber-text)' : undefined} />
          <SummaryTile label="Past their 30-day target" value={overdue} accentColor={overdue ? 'var(--red)' : undefined} />
          <SummaryTile label="Exports completed" value={count(r => r.kind === 'EXPORT' && r.status === 'COMPLETED')} />
          <SummaryTile label="Deletions completed" value={count(r => r.kind === 'DELETION' && r.status === 'COMPLETED')} />
        </div>
        <div><Link to="/platform/compliance/requests" className="btn btn-primary btn-sm">Open data requests</Link></div>
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="form-title" style={{ margin: 0 }}>Retention</h2>
        <div className="tile-grid tile-grid-wide">
          <SummaryTile label="Schools with a retention policy set" value={`${data.retention.schoolsWithRetention} of ${data.retention.activeSchools}`} />
          <SummaryTile label="Removed students still on file" value={data.retention.removedStudentsKept} />
          <SummaryTile label="Schools on legal hold" value={data.legalHolds.length} accentColor={data.legalHolds.length ? 'var(--amber-text)' : undefined} />
        </div>
        <p className="field-label" style={{ margin: 0 }}>Each school sets its own retention in its Data & Privacy page; the server applies it daily. A legal hold pauses all deletion for that school.</p>
        {data.legalHolds.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>School on hold</th><th>Reason</th><th>Since</th><th /></tr></thead>
              <tbody>
                {data.legalHolds.map(hold => (
                  <tr key={hold.id}>
                    <td><Link to={`/platform/schools/${hold.id}`}>{hold.name}</Link></td>
                    <td>{hold.reason}</td>
                    <td>{formatUtcTimestamp(hold.since)}{hold.setBy && <div className="field-label" style={{ margin: 0 }}>by {hold.setBy}</div>}</td>
                    <td>{can('legal_hold:manage') && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ schoolId: hold.id, name: hold.name, hold: false })}>Release</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {can('legal_hold:manage') && (
          <div className="action-row">
            <select className="input" style={{ maxWidth: 320 }} aria-label="School to place on legal hold" value={holdSchoolId} onChange={e => setHoldSchoolId(e.target.value)}>
              <option value="">Choose a school…</option>
              {schools.filter(s => !data.legalHolds.some(h => h.id === s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm" disabled={!holdSchoolId} onClick={() => setDialog({ schoolId: holdSchoolId, name: schools.find(s => s.id === holdSchoolId)?.name ?? 'this school', hold: true })}>Place on legal hold</button>
          </div>
        )}
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="form-title" style={{ margin: 0 }}>Security controls</h2>
        <p className="field-label" style={{ margin: 0 }}>Checked by the server about itself. Settings values and secrets are never shown.</p>
        <ul className="check-list">
          <Check ok label="Passwords are hashed" detail={c.passwordHashing} />
          <Check ok={c.mfaSecretsEncrypted} label="Two-step verification secrets are encrypted" detail={c.mfaSecretsEncrypted ? 'An encryption key is configured.' : 'MFA_ENCRYPTION_KEY is not set on this server.'} />
          <Check ok={c.mfaRequiredForAdmins} label="Two-step verification is required for administrators" />
          <Check ok={c.httpsEnforced} label="HTTPS is enforced" detail={c.httpsEnforced ? 'Plain HTTP is redirected or refused.' : 'Not running behind the production proxy (normal for local development).'} />
          <Check ok={c.databaseTls} label="Database connection uses TLS" />
          <Check ok={c.auditLogAppendOnly} label="Audit log is append-only" detail={`${c.auditEntriesLast30Days.toLocaleString()} entries in the last 30 days; the database refuses edits and deletions.`} />
          <Check ok label="School data is kept separate" detail={c.tenantIsolation} />
          <Check ok={c.emailConfigured} label="Email notifications are working" detail={c.emailConfigured ? undefined : 'Email sending is not set up, so invites and alerts are not emailed.'} />
        </ul>
        <MfaCoverageTiles mfa={data.mfa} />
      </section>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="form-title" style={{ margin: 0 }}>Policies</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
          {POLICIES.map(([slug, title]) => <li key={slug}><Link to={`/legal/${slug}`} target="_blank" rel="noreferrer">{title}</Link></li>)}
        </ul>
      </section>

      {dialog && (
        <ReasonDialog
          title={dialog.hold ? `Place ${dialog.name} on legal hold?` : `Release the legal hold on ${dialog.name}?`}
          message={dialog.hold
            ? 'No permanent deletion of any kind will run for this school (including its daily retention clean-up and approved deletion requests) until the hold is released.'
            : 'Deletions and retention for this school resume. Anything already past its retention period will be deleted at the next daily run.'}
          confirmLabel={dialog.hold ? 'Place on hold' : 'Release hold'}
          danger={!dialog.hold}
          onConfirm={confirmHold}
          onClose={() => setDialog(null)}
        />
      )}
    </Screen>
  );
}
