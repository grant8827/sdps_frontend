import { useEffect, useMemo, useState } from 'react';
import { Screen } from '../../components/Screen';
import { InviteResult } from '../../components/InviteResult';
import { useAuth } from '../../context/AuthContext';
import { api, type ClassRow, type InviteResult as InviteResultData, type StaffRole, type StaffRow } from '../../services/api';

const emptyForm = { fullName: '', email: '', classId: '', photoDataUrl: '', role: 'teacher' as StaffRole };

const ROLE_LABELS: Record<StaffRow['role'], string> = { teacher: 'Teacher', school_admin: 'Admin', staff: 'Front Desk / Office Staff' };
const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
  { value: 'front_desk', label: 'Front Desk / Office Staff' },
];

type Tab = 'staff' | 'register';

/**
 * Admin Faculty screen: the Staff tab lists everyone with a staff-level
 * account (teachers, admins, front desk) with suspend/delete actions;
 * Add Staff creates one, with a role picker that decides what kind of
 * account they get (teacher login vs admin-dashboard login) — the
 * classroom field only makes sense, and only shows, for the Teacher role.
 * Nobody types a password for someone else: each new person gets an
 * email link to choose their own, and "Resend invite" / "Email reset
 * link" sends a fresh one.
 */
export function FacultyManagementScreen() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<Tab>('staff');
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<{ name: string; result: InviteResultData } | null>(null);

  const load = async () => {
    if (!token) return;
    const [nextStaff, nextClasses] = await Promise.all([api.staff(token), api.classes(token)]);
    setStaff(nextStaff);
    setClasses(nextClasses);
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const availableClasses = useMemo(() => classes.filter(c => !c.teacherId), [classes]);
  const set = <K extends keyof typeof form>(key: K, value: typeof form[K]) => setForm(current => ({ ...current, [key]: value }));

  const onPhotoSelected = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('photoDataUrl', typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!token) return;
    setMessage('');
    setInvite(null);
    if (!form.fullName.trim() || !form.email.trim()) { setMessage('Full name and email are required.'); return; }
    setSubmitting(true);
    try {
      const result = await api.addStaff(token, {
        fullName: form.fullName,
        email: form.email,
        photoDataUrl: form.photoDataUrl || undefined,
        role: form.role,
        classId: form.role === 'teacher' ? form.classId || undefined : undefined,
      });
      const roleLabel = ROLE_LABELS[form.role === 'admin' ? 'school_admin' : form.role === 'front_desk' ? 'staff' : 'teacher'];
      setMessage(result.restored
        ? `${form.fullName.trim()} was on your staff before and has been added back as ${roleLabel}. They can sign in with their old password or choose a new one from the email link.`
        : `${form.fullName.trim()} was added as ${roleLabel}.`);
      setInvite({ name: form.fullName.trim(), result });
      setForm(emptyForm);
      setTab('staff');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSuspend = async (member: StaffRow) => {
    if (!token) return;
    try { await api.setStaffStatus(token, member.id, !member.active); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update staff member'); }
  };
  // For a lost phone (and lost recovery codes): clears their two-step
  // verification and signs them out; they set it up again at next sign-in.
  const resetMfa = async (member: StaffRow) => {
    if (!token || !window.confirm(`Reset two-step verification for ${member.fullName}? Only do this after confirming who is asking. They'll be signed out and set it up again at their next sign-in.`)) return;
    try { await api.resetStaffMfa(token, member.id); setMessage(`Two-step verification reset for ${member.fullName}.`); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not reset two-step verification'); }
  };
  const sendLink = async (member: StaffRow) => {
    if (!token) return;
    setMessage(''); setInvite(null);
    try { setInvite({ name: member.fullName, result: await api.sendAccountLink(token, member.id) }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send the link'); }
  };
  const remove = async (member: StaffRow) => {
    if (!token || !window.confirm(`Delete ${member.fullName}? This removes their account and cannot be undone.`)) return;
    try { await api.deleteStaff(token, member.id); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete staff member'); }
  };

  return (
    <Screen title="Faculty" subtitle="Manage teachers, admins, and office staff.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'staff' ? ' subtab-active' : ''}`} onClick={() => setTab('staff')}>Staff</button>
        <button type="button" className={`subtab${tab === 'register' ? ' subtab-active' : ''}`} onClick={() => setTab('register')}>Add Staff</button>
      </div>
      {message && <div className="card">{message}</div>}
      {invite && <InviteResult name={invite.name} result={invite.result} onDismiss={() => setInvite(null)} />}

      {tab === 'register' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-title" style={{ marginBottom: 0 }}>Add Staff</p>

          <div className="btn-row" style={{ alignItems: 'center' }}>
            {form.photoDataUrl
              ? <img src={form.photoDataUrl} alt="" className="avatar avatar-lg" />
              : <span className="avatar avatar-lg avatar-placeholder">{form.fullName.charAt(0) || '?'}</span>}
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              Upload photo (optional)
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onPhotoSelected(e.target.files?.[0])} />
            </label>
          </div>

          <p className="field-label" style={{ margin: 0 }}>Role</p>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value as StaffRole)}>
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <input className="input" placeholder="Full Name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <p className="field-label" style={{ margin: 0 }}>They'll get an email with a link to choose their own password.</p>

          {form.role === 'teacher' && (
            <select className="input" value={form.classId} onChange={e => set('classId', e.target.value)}>
              <option value="">No classroom assigned yet</option>
              {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Staff'}
          </button>
        </div>
      )}

      {tab === 'staff' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th /><th>Name</th><th>Role</th><th>Class</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {staff.map(member => (
                <tr key={member.id}>
                  <td>{member.photoUrl ? <img src={member.photoUrl} alt="" className="avatar" /> : <span className="avatar avatar-placeholder">{member.fullName.charAt(0)}</span>}</td>
                  <td>{member.fullName}</td>
                  <td>{ROLE_LABELS[member.role]}</td>
                  <td>{member.className || '—'}</td>
                  <td><span className="pill" style={{ backgroundColor: member.active ? 'var(--green)' : 'var(--red)' }}>{member.active ? 'Active' : 'Suspended'}</span></td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleSuspend(member)}>{member.active ? 'Suspend' : 'Reactivate'}</button>
                    {member.active && member.id !== user?.id && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => sendLink(member)}>{member.needsSetup ? 'Resend invite' : 'Email reset link'}</button>
                    )}
                    {member.mfaEnabled && member.id !== user?.id && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => resetMfa(member)}>Reset 2-step</button>
                    )}
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(member)}>Delete</button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && <tr><td colSpan={6} className="empty-text">No staff added yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}
