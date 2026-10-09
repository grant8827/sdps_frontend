import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../components/Screen';
import { SummaryTile } from '../components/SummaryTile';
import { StatusBadge } from '../components/StatusBadge';
import { ReasonDialog } from '../components/ReasonDialog';
import { useAuth } from '../context/AuthContext';
import { api, type PlatformAuditEntry, type PlatformSchoolDetail } from '../services/api';
import { formatUtcTimestamp } from '../utils/utcTime';
import { AttendanceTab, NotificationsTab, OperationsTab, PickupRulesTab, PlaceholderTab, SecurityTab, StudentsTab, SubscriptionTab, UsersTab } from './schoolTabs';

type Tab = 'overview' | 'admins' | 'staff' | 'parents' | 'students' | 'operations' | 'attendance' | 'locations' | 'rules'
  | 'notifications' | 'integrations' | 'subscription' | 'security' | 'audit';
type Dialog = 'suspend' | 'reactivate' | 'archive' | 'support' | null;

const TABS: { key: Tab; label: string; permission?: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'admins', label: 'Administrators' },
  { key: 'staff', label: 'Teachers & Staff', permission: 'user:view' },
  { key: 'parents', label: 'Parents', permission: 'user:view' },
  { key: 'students', label: 'Students', permission: 'student:view' },
  { key: 'operations', label: 'Drop-off & Pickup', permission: 'pickup:view' },
  { key: 'attendance', label: 'Attendance', permission: 'attendance:view' },
  { key: 'locations', label: 'Locations & Hours' },
  { key: 'rules', label: 'Pickup Rules' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'subscription', label: 'Subscription', permission: 'billing:view' },
  { key: 'security', label: 'Security', permission: 'security:view' },
  { key: 'audit', label: 'Audit Log', permission: 'audit:view' },
];

/**
 * Platform → one school: overview (counts and setup checklist),
 * administrators, locations, and its audit trail. Actions: edit name,
 * suspend / reactivate / archive (each needs a reason), and "View as
 * School Admin", which opens an audited, time-limited support session.
 */
export function SchoolDetailScreen() {
  const { schoolId = '' } = useParams();
  const { token, can, startSupport } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [school, setSchool] = useState<PlatformSchoolDetail | null>(null);
  const [audit, setAudit] = useState<PlatformAuditEntry[] | null>(null);
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editingName, setEditingName] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setSchool(await api.platformSchool(token, schoolId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the school');
    }
  }, [token, schoolId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (token && tab === 'audit' && can('audit:view')) {
      api.platformAuditLogs(token, { schoolId }).then(page => setAudit(page.entries)).catch(error => setMessage(error.message));
    }
  }, [token, tab, schoolId, can]);

  if (!school) return <Screen title="School">{message ? <div className="card" role="alert">{message}</div> : <p className="empty-text">Loading…</p>}</Screen>;

  const act = (action: 'suspend' | 'reactivate' | 'archive') => async (reason: string) => {
    await api.platformSchoolAction(token!, school.id, action, reason);
    setDialog(null);
    setMessage(action === 'suspend' ? `${school.name} is suspended. Its users can't sign in until it's reactivated.` : action === 'archive' ? `${school.name} is archived.` : `${school.name} is active again.`);
    await load();
  };
  const beginSupport = async (reason: string, allowChanges: boolean) => {
    await startSupport(school.id, reason, allowChanges);
    navigate('/admin');
  };
  const saveName = async () => {
    if (!token || editingName === null || !editingName.trim()) return;
    try {
      await api.platformUpdateSchool(token, school.id, { name: editingName.trim() });
      setEditingName(null);
      setMessage('School name saved.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save');
    }
  };

  const setupDone = school.setup.filter(item => item.done).length;

  return (
    <Screen title={school.name} subtitle={`Code ${school.code} · ${school.organizationName} · added ${formatUtcTimestamp(school.createdAt)}`}>
      <p style={{ margin: 0 }}><Link to="/platform/schools">← All schools</Link></p>
      <div className="action-row">
        <StatusBadge status={school.status} />
        {school.status === 'ACTIVE' && can('support:start') && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog('support')}>View as School Admin</button>
        )}
        {can('school:update') && editingName === null && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingName(school.name)}>Edit name</button>}
        {school.status === 'ACTIVE' && can('school:suspend') && <button type="button" className="btn btn-danger btn-sm" onClick={() => setDialog('suspend')}>Suspend</button>}
        {school.status !== 'ACTIVE' && can('school:suspend') && (school.status === 'SUSPENDED' || can('school:archive')) && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog('reactivate')}>Reactivate</button>
        )}
        {school.status === 'SUSPENDED' && can('school:archive') && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog('archive')}>Archive</button>}
      </div>
      {editingName !== null && (
        <div className="action-row">
          <input className="input" style={{ maxWidth: 360 }} aria-label="School name" value={editingName} onChange={e => setEditingName(e.target.value)} />
          <button type="button" className="btn btn-primary btn-sm" onClick={saveName}>Save</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingName(null)}>Cancel</button>
        </div>
      )}
      {school.status === 'SUSPENDED' && <div className="card"><strong>Suspended</strong> {school.suspendedAt && `on ${formatUtcTimestamp(school.suspendedAt)}`}{school.suspendedReason && ` — ${school.suspendedReason}`}</div>}
      {message && <div className="card" role="status">{message}</div>}

      {/* Each tab shows only with the permission its data needs (the API checks it too). */}
      <div className="subtabs subtabs-wrap" role="tablist">
        {TABS.filter(t => !t.permission || can(t.permission)).map(({ key, label }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`subtab${tab === key ? ' subtab-active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {(tab === 'staff' || tab === 'parents') && <UsersTab key={tab} schoolId={school.id} kind={tab} />}
      {tab === 'students' && <StudentsTab schoolId={school.id} />}
      {tab === 'operations' && <OperationsTab schoolId={school.id} />}
      {tab === 'attendance' && <AttendanceTab schoolId={school.id} />}
      {tab === 'rules' && <PickupRulesTab school={school} />}
      {tab === 'notifications' && <NotificationsTab schoolId={school.id} />}
      {tab === 'integrations' && <PlaceholderTab title="Integrations" text="No integrations are connected. SDPMPlus doesn't sync with student information systems (SIS) or other services yet; this is where they'll appear." />}
      {tab === 'subscription' && <SubscriptionTab schoolId={school.id} />}
      {tab === 'security' && <SecurityTab schoolId={school.id} />}

      {tab === 'overview' && (
        <>
          <div className="tile-grid">
            <SummaryTile label="Students" value={school.counts.students} />
            <SummaryTile label="Teachers & staff" value={school.counts.staff} />
            <SummaryTile label="Parents & guardians" value={school.counts.parents} />
            <SummaryTile label="Locations" value={school.counts.locations} />
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="form-title" style={{ margin: 0 }}>Setup ({setupDone} of {school.setup.length} done)</p>
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
              {school.setup.map(item => (
                <li key={item.key} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                  <span aria-hidden style={{ color: item.done ? 'var(--green)' : 'var(--amber-text)', fontWeight: 700 }}>{item.done ? '✓' : '!'}</span>
                  <span>{item.label}</span>
                  <span className="sr-only">{item.done ? '(done)' : '(not yet)'}</span>
                </li>
              ))}
            </ul>
            <p className="field-label" style={{ margin: 0 }}>Time zone: {school.timezone}{school.activeYear ? ` · School year ${school.activeYear.name}` : ''}</p>
          </div>
        </>
      )}

      {tab === 'admins' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Administrator</th><th>Status</th><th>Two-step verification</th></tr></thead>
            <tbody>
              {school.admins.map(admin => (
                <tr key={admin.id}>
                  <td>{admin.fullName}<div className="field-label" style={{ margin: 0 }}>{admin.email}</div></td>
                  <td><StatusBadge status={admin.accountActive ? admin.status : 'DISABLED'} />{admin.needsSetup && <div className="field-label" style={{ margin: '4px 0 0' }}>Invited, not set up yet</div>}</td>
                  <td>{admin.mfaEnabled ? 'On' : 'Not set up'}</td>
                </tr>
              ))}
              {school.admins.length === 0 && <tr><td colSpan={3} className="empty-text">No administrators.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'locations' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Location</th><th>Status</th><th>Pickup area</th><th>Hours</th></tr></thead>
            <tbody>
              {school.locations.map(location => (
                <tr key={location.id}>
                  <td>{location.name}<div className="field-label" style={{ margin: 0 }}>{location.address || 'No address yet'}</div></td>
                  <td><StatusBadge status={location.status} /></td>
                  <td>{location.mapped ? `Mapped · ${location.geofenceRadius ?? 150} m` : 'Not mapped yet'}</td>
                  <td>{location.startTime || location.dismissalTime ? `${location.startTime ?? '—'} – ${location.dismissalTime ?? '—'}` : 'School default'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        audit === null ? <p className="empty-text">Loading…</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>When</th><th>Who</th><th>Action</th><th>About</th><th>Reason</th></tr></thead>
              <tbody>
                {audit.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatUtcTimestamp(entry.createdAt)}</td>
                    <td>{entry.actorName ?? '—'}<div className="field-label" style={{ margin: 0 }}>{entry.actorRole}</div></td>
                    <td>{entry.action}{entry.supportSessionId && <div className="field-label" style={{ margin: 0 }}>Support session</div>}</td>
                    <td>{entry.targetLabel ?? '—'}</td>
                    <td>{entry.reason ?? '—'}</td>
                  </tr>
                ))}
                {audit.length === 0 && <tr><td colSpan={5} className="empty-text">No entries yet.</td></tr>}
              </tbody>
            </table>
            <p className="field-label"><Link to={`/platform/audit-logs?schoolId=${school.id}`}>Search this school's full audit log →</Link></p>
          </div>
        )
      )}

      {dialog === 'support' && (
        <ReasonDialog
          title={`View ${school.name} as School Administrator`}
          message="You'll see the school's admin dashboard for up to an hour. The school can see in its audit log that you looked, and why."
          confirmLabel="Start support session"
          option={can('support:write') ? { label: 'Allow changes', help: 'Leave this off to look without changing anything. Every change is recorded.' } : undefined}
          onConfirm={beginSupport}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'suspend' && (
        <ReasonDialog
          title={`Suspend ${school.name}?`}
          message="Everyone at this school is signed out and can't sign in, and drop-off and pick-up stop, until it's reactivated. Nothing is deleted."
          confirmLabel="Suspend school"
          danger
          onConfirm={act('suspend')}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'reactivate' && (
        <ReasonDialog title={`Reactivate ${school.name}?`} message="Its users can sign in again right away." confirmLabel="Reactivate" onConfirm={act('reactivate')} onClose={() => setDialog(null)} />
      )}
      {dialog === 'archive' && (
        <ReasonDialog
          title={`Archive ${school.name}?`}
          message="Archived schools stay closed and are kept for the record. Nothing is deleted, and a super admin can still restore them."
          confirmLabel="Archive"
          danger
          onConfirm={act('archive')}
          onClose={() => setDialog(null)}
        />
      )}
    </Screen>
  );
}
