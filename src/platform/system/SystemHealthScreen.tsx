import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type HealthStatus, type SystemHealth } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

// Text plus color, never color alone.
const STATUS: Record<HealthStatus, { label: string; bg: string; color?: string }> = {
  ok: { label: 'Working', bg: 'var(--green)' },
  degraded: { label: 'Needs attention', bg: 'var(--amber)', color: 'var(--on-amber)' },
  down: { label: 'Not working', bg: 'var(--red)' },
  not_configured: { label: 'Not set up', bg: 'var(--amber)', color: 'var(--on-amber)' },
  not_offered: { label: 'Not offered yet', bg: '#6B7280' },
  unknown: { label: 'Unknown', bg: '#6B7280' },
};
const Badge = ({ status }: { status: HealthStatus }) => <span className="pill" style={{ backgroundColor: STATUS[status].bg, color: STATUS[status].color }}>{STATUS[status].label}</span>;

function Part({ title, status, children }: { title: string; status: HealthStatus; children?: ReactNode }) {
  return (
    <section className="card health-part">
      <div className="card-row" style={{ gap: 8 }}><h2 className="form-title" style={{ margin: 0, fontSize: 16 }}>{title}</h2><Badge status={status} /></div>
      {children && <dl className="health-facts">{children}</dl>}
    </section>
  );
}
const Fact = ({ label, children }: { label: string; children: ReactNode }) => <><dt>{label}</dt><dd>{children}</dd></>;
const when = (iso?: string | null) => (iso ? new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`).toLocaleString() : 'Never');

/**
 * Platform → System Health: whether each part of SDPMPlus is working —
 * this server, the database, email, background jobs, retention, storage
 * and which app versions are in use — plus settings that are unsafe for
 * production. Shows state only, never settings values or credentials.
 */
export function SystemHealthScreen() {
  const { token, can } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const load = useCallback(() => { if (token) api.systemHealth(token).then(setHealth).catch(err => setMessage(err.message)); }, [token]);
  useEffect(load, [load]);

  const checkEmail = async () => {
    if (!token) return;
    setChecking(true);
    try { setMessage((await api.checkEmailConnection(token)).message); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not check'); } finally { setChecking(false); }
  };

  if (!health) return <Screen title="System Health">{message ? <div className="card" role="alert">{message}</div> : <p className="empty-text">Checking…</p>}</Screen>;
  const { api: server, database: db, email, jobs, retention, storage } = health;

  return (
    <Screen title="System Health" subtitle="Whether each part of SDPMPlus is working right now.">
      <div className="action-row">
        <span>Overall: <Badge status={health.status} /></span>
        <span className="field-label" style={{ margin: 0 }}>Checked {new Date(health.generatedAt).toLocaleTimeString()}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Check again</button>
      </div>
      {message && <div className="card" role="status">{message}</div>}

      {health.warnings.length > 0 && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="form-title" style={{ margin: 0, fontSize: 16 }}>Settings to fix</h2>
          <ul className="attention-list">
            {health.warnings.map(w => (
              <li key={w.setting + w.message} className={`attention-item severity-${w.severity}`}>
                <span className="attention-severity">{w.severity}</span>
                <div><p className="attention-title"><code>{w.setting}</code></p><p className="field-label" style={{ margin: 0 }}>{w.message}</p></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="health-grid">
        <Part title="Web server (API)" status={server.status}>
          <Fact label="Version">{server.version}{server.commit && ` (${server.commit})`}</Fact>
          <Fact label="Environment">{server.environment}</Fact>
          <Fact label="Running since">{when(server.startedAt)} ({server.uptimeMinutes} min)</Fact>
          <Fact label="Memory">{server.memoryMb} MB</Fact>
          <Fact label="Response delay (p99)">{server.eventLoopDelayMs} ms</Fact>
          <Fact label="Node.js">{server.nodeVersion}</Fact>
        </Part>
        <Part title="Database" status={db.status}>
          {db.message ? <Fact label="Problem">{db.message}</Fact> : (
            <>
              <Fact label="Response time">{db.latencyMs} ms</Fact>
              <Fact label="Version">{db.serverVersion}</Fact>
              <Fact label="Size">{db.sizeMb} MB</Fact>
              <Fact label="Schema">{db.migrationsApplied === db.migrationsExpected ? `Up to date (${db.migrationsApplied})` : `${db.migrationsApplied} of ${db.migrationsExpected}: not fully updated`}</Fact>
              <Fact label="Connections">{db.connections?.total} open, {db.connections?.idle} idle, {db.connections?.waiting} waiting</Fact>
            </>
          )}
        </Part>
        <Part title="Email" status={email.status}>
          {email.status === 'not_configured' ? <Fact label="Setup">The SMTP_* settings are missing.</Fact> : (
            <>
              <Fact label="Sent (24 h)">{email.sent24h}</Fact>
              <Fact label="Failed (24 h)">{email.failed24h}</Fact>
              <Fact label="Last sent">{when(email.lastSentAt)}</Fact>
            </>
          )}
          {can('platform:settings') && <div style={{ gridColumn: '1 / -1' }}><button type="button" className="btn btn-secondary btn-sm" onClick={checkEmail} disabled={checking}>{checking ? 'Checking…' : 'Test the email connection'}</button></div>}
        </Part>
        <Part title="Background jobs" status={jobs.status}>
          <Fact label="Waiting">{jobs.queued ?? '—'}{jobs.oldestQueuedMinutes !== null && jobs.oldestQueuedMinutes !== undefined && ` (oldest ${jobs.oldestQueuedMinutes} min)`}</Fact>
          <Fact label="Running">{jobs.running ?? '—'}</Fact>
          <Fact label="Finished (24 h)">{jobs.succeeded24h ?? '—'}</Fact>
          <Fact label="Failed (24 h)">{jobs.failed24h ?? '—'}</Fact>
          <Fact label="Worker on this server">{jobs.workerRunningHere ? `Running (last checked ${when(jobs.workerLastTickAt)})` : 'Not running here'}</Fact>
        </Part>
        <Part title="Daily retention" status={retention.status}>
          <Fact label="Last run on this server">{when(retention.lastRunAt)}</Fact>
          <Fact label="Schools that failed">{retention.failures}</Fact>
        </Part>
        <Part title="Storage" status="ok">
          <Fact label="Database">{storage.databaseMb ?? '—'} MB</Fact>
          <Fact label="Report files kept">{storage.exportFilesMb ?? '—'} MB</Fact>
          <Fact label="Audit log entries">{storage.auditEntriesApprox?.toLocaleString() ?? '—'} (approx.)</Fact>
        </Part>
        <Part title="Text messages (SMS)" status={health.sms.status} />
        <Part title="Push notifications" status={health.push.status} />
      </div>

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="form-title" style={{ margin: 0, fontSize: 16 }}>Mobile app versions in use</h2>
        {health.clients.length === 0 ? <p className="field-label" style={{ margin: 0 }}>No app has reported its version yet (apps from this update onward do).</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>App</th><th>Version</th><th>First seen</th><th>Last seen</th></tr></thead>
              <tbody>{health.clients.map(c => <tr key={c.client + c.version}><td>{c.client.replace('mobile-ios', 'iPhone').replace('mobile-android', 'Android')}</td><td>{c.version}</td><td>{formatUtcTimestamp(c.firstSeen)}</td><td>{formatUtcTimestamp(c.lastSeen)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      {db.largestTables && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="form-title" style={{ margin: 0, fontSize: 16 }}>Largest tables</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Table</th><th>Size</th><th>Rows (approx.)</th></tr></thead>
              <tbody>{db.largestTables.map(t => <tr key={t.name}><td><code>{t.name}</code></td><td>{t.sizeMb} MB</td><td>{t.approxRows.toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </Screen>
  );
}
