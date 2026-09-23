import { useEffect, useMemo, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type ClassRow, type StaffRole, type StaffRow } from '../../services/api';

const emptyForm = { fullName: '', email: '', password: '', classId: '', photoDataUrl: '', role: 'teacher' as StaffRole };

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
 */
export function FacultyManagementScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('staff');
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!form.fullName.trim() || !form.email.trim() || !form.password) { setMessage('Full name, email, and password are required.'); return; }
    setSubmitting(true);
    try {
      await api.addStaff(token, {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        photoDataUrl: form.photoDataUrl || undefined,
        role: form.role,
        classId: form.role === 'teacher' ? form.classId || undefined : undefined,
      });
      setMessage(`${ROLE_LABELS[form.role === 'admin' ? 'school_admin' : form.role === 'front_desk' ? 'staff' : 'teacher']} added.`);
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
          <input className="input" placeholder="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} />

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
