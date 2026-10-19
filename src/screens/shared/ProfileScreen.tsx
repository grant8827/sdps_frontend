import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PasswordInput } from '../../components/PasswordInput';
import { DeleteSchoolCard } from '../../components/DeleteSchoolCard';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const ROLE_LABEL: Record<string, string> = { parent: 'Parent', teacher: 'Teacher', admin: 'Administrator' };

/**
 * Profile (every role), same as the app's: the account's name, email
 * and role, and changing the password. Two-step verification — and,
 * for parents, the pickup PIN — are on the Security page.
 */
export function ProfileScreen() {
  const { token, user, schools, supportSession, canManageSchool } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const securityPath = user?.platform && !supportSession ? '/platform/security' : `/${user?.role}/security`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!current || !next) { setMessage('Enter your current password and a new one.'); return; }
    if (next.length < 8) { setMessage('The new password must be at least 8 characters.'); return; }
    if (next !== confirm) { setMessage("The two new passwords don't match."); return; }
    setSaving(true);
    setMessage('');
    try {
      await api.changePassword(token, current, next);
      setMessage('Your password has been changed.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not change the password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Profile" subtitle="Your account details.">
      <div className="card" style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
        {[
          ['Full name', user?.fullName],
          ['Email', user?.email],
          ['Role', user?.platform ? 'Platform administrator' : ROLE_LABEL[user?.role ?? ''] ?? user?.role],
          ...(schools.length > 0 ? [[schools.length > 1 ? 'Schools' : 'School', schools.map(school => school.schoolName).join(', ')]] : []),
        ].map(([label, value]) => (
          <div key={label}>
            <div className="field-label" style={{ margin: 0 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{value || '—'}</div>
          </div>
        ))}
      </div>

      <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }} onSubmit={submit}>
        <p className="form-title" style={{ margin: 0 }}>Change password</p>
        <PasswordInput placeholder="Current password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} />
        <PasswordInput placeholder="New password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} />
        <PasswordInput placeholder="Confirm new password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <p className="field-hint" style={{ margin: 0 }}>At least 8 characters.</p>
        {message && <p role="status" style={{ margin: 0, fontSize: 14 }}>{message}</p>}
        <div><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save password'}</button></div>
      </form>

      <p className="field-label" style={{ margin: 0 }}>
        Two-step verification{user?.role === 'parent' ? ' and your pickup PIN are' : ' is'} on the <Link to={securityPath}>Security</Link> page.
      </p>

      {/* Only a school's own administrator, never during a platform support session. */}
      {user?.role === 'admin' && canManageSchool && !supportSession && <DeleteSchoolCard />}
    </Screen>
  );
}
