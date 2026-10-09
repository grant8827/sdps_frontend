import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Screen } from '../components/Screen';
import { StatusBadge } from '../components/StatusBadge';
import { ReasonDialog } from '../components/ReasonDialog';
import { InviteResult } from '../components/InviteResult';
import { useAuth } from '../context/AuthContext';
import { api, type InviteResult as InviteResultData, type PlatformAdminRow } from '../services/api';
import type { PlatformRole } from '../types';
import { ROLE_LABELS } from '../utils/auditLabels';

const ROLES: { value: PlatformRole; help: string }[] = [
  { value: 'SUPER_ADMIN', help: 'Everything, including platform administrators and archiving schools.' },
  { value: 'PLATFORM_ADMIN', help: 'Schools, users, audit logs and read-only support sessions.' },
  { value: 'SUPPORT_ADMIN', help: 'View schools and audit logs, and read-only support sessions.' },
  { value: 'BILLING_ADMIN', help: 'View schools and manage billing.' },
];

type Pending = { admin: PlatformAdminRow; change: { role?: PlatformRole; status?: 'ACTIVE' | 'DISABLED' }; title: string } | null;

/**
 * Platform → Platform Administrators (super admins only): who can run
 * SDPMPlus, their role, and whether they've set up two-step verification.
 * Every role or status change needs a reason, and you can't change your
 * own access or remove the last super admin.
 */
export function AdminsScreen() {
  const { token, user } = useAuth();
  const [admins, setAdmins] = useState<PlatformAdminRow[]>([]);
  const [form, setForm] = useState<{ email: string; fullName: string; role: PlatformRole }>({ email: '', fullName: '', role: 'SUPPORT_ADMIN' });
  const [message, setMessage] = useState('');
  const [invite, setInvite] = useState<{ name: string; result: InviteResultData } | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const load = useCallback(async () => {
    if (token) setAdmins(await api.platformAdmins(token));
  }, [token]);
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setMessage(''); setInvite(null);
    try {
      const result = await api.platformAddAdmin(token, { email: form.email.trim(), fullName: form.fullName.trim() || undefined, role: form.role });
      setMessage(`${form.email.trim()} is now ${ROLE_LABELS[form.role]}. They must set up two-step verification when they sign in.`);
      if (result.emailSent !== undefined) setInvite({ name: form.fullName.trim() || form.email.trim(), result });
      setForm({ email: '', fullName: '', role: 'SUPPORT_ADMIN' });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add them');
    }
  };

  const confirmChange = async (reason: string) => {
    if (!token || !pending) return;
    await api.platformUpdateAdmin(token, pending.admin.id, { ...pending.change, reason });
    setPending(null);
    setMessage(`${pending.admin.fullName} updated.`);
    await load();
  };

  return (
    <Screen title="Platform Administrators" subtitle="People who run SDPMPlus itself. Every platform role needs two-step verification.">
      {message && <div className="card" role="status">{message}</div>}
      {invite && <InviteResult name={invite.name} result={invite.result} onDismiss={() => setInvite(null)} />}

      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Two-step</th><th>Actions</th></tr></thead>
          <tbody>
            {admins.map(admin => {
              const isMe = admin.id === user?.id;
              return (
                <tr key={admin.id}>
                  <td>{admin.fullName}{isMe && ' (you)'}<div className="field-label" style={{ margin: 0 }}>{admin.email}</div></td>
                  <td>
                    {isMe ? ROLE_LABELS[admin.role] : (
                      <select
                        className="input"
                        aria-label={`Role for ${admin.fullName}`}
                        value={admin.role}
                        onChange={e => setPending({ admin, change: { role: e.target.value as PlatformRole }, title: `Change ${admin.fullName} to ${ROLE_LABELS[e.target.value]}?` })}
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{ROLE_LABELS[r.value]}</option>)}
                      </select>
                    )}
                  </td>
                  <td><StatusBadge status={admin.status} />{admin.needsSetup && <div className="field-label" style={{ margin: '4px 0 0' }}>Hasn't set a password yet</div>}</td>
                  <td>{admin.mfaEnabled ? 'On' : 'Not set up'}</td>
                  <td className="actions-cell">
                    {!isMe && (admin.status === 'ACTIVE'
                      ? <button type="button" className="btn btn-danger btn-sm" onClick={() => setPending({ admin, change: { status: 'DISABLED' }, title: `Disable ${admin.fullName}?` })}>Disable</button>
                      : <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPending({ admin, change: { status: 'ACTIVE' }, title: `Reactivate ${admin.fullName}?` })}>Reactivate</button>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }} onSubmit={add}>
        <p className="form-title" style={{ margin: 0 }}>Add a platform administrator</p>
        <label className="field-label" style={{ margin: 0 }} htmlFor="pa-email">Email</label>
        <input id="pa-email" className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <label className="field-label" style={{ margin: 0 }} htmlFor="pa-name">Full name (needed if they don't have an account yet)</label>
        <input id="pa-name" className="input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          <legend className="field-label" style={{ marginBottom: 4 }}>Role</legend>
          {ROLES.map(r => (
            <label key={r.value} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 }}>
              <input type="radio" name="pa-role" checked={form.role === r.value} onChange={() => setForm(f => ({ ...f, role: r.value }))} style={{ marginTop: 3 }} />
              <span><strong>{ROLE_LABELS[r.value]}</strong> — {r.help}</span>
            </label>
          ))}
        </fieldset>
        <div><button type="submit" className="btn btn-primary">Add administrator</button></div>
      </form>

      {pending && (
        <ReasonDialog
          title={pending.title}
          message={pending.change.status === 'DISABLED' ? "They're signed out everywhere and lose platform access." : undefined}
          confirmLabel="Confirm"
          danger={pending.change.status === 'DISABLED'}
          onConfirm={confirmChange}
          onClose={() => setPending(null)}
        />
      )}
    </Screen>
  );
}
