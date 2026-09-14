import { useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Sibling', 'Guardian', 'Other'];
const emptyForm = { fullName: '', email: '', phone: '', relationship: 'Grandmother', temporaryPassword: '' };

/**
 * Lets a parent invite a co-guardian (e.g. the other parent, or a
 * grandparent) onto their own account — the invitee gets drop-off/
 * pick-up access to every child this parent already has access to.
 * The school admin is notified (see admin's Overview screen).
 */
export function AddGuardianScreen() {
  const { token } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!token) return;
    setMessage('');
    if (!form.fullName.trim() || !form.email.trim() || !form.temporaryPassword) {
      setMessage('Name, email, and a temporary password are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.inviteGuardian(token, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        relationship: form.relationship,
        temporaryPassword: form.temporaryPassword,
      });
      setMessage(`${form.fullName.trim()} can now log in and drop off/pick up your children. Share their email and temporary password with them.`);
      setForm(emptyForm);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add guardian');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Add Guardian" subtitle="Invite another parent or family member to drop off/pick up your children.">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input className="input" placeholder="Full Name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
        <input className="input" placeholder="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        <input className="input" placeholder="Phone (optional)" value={form.phone} onChange={e => set('phone', e.target.value)} />
        <p className="field-label" style={{ margin: 0 }}>Relationship to your child(ren)</p>
        <select className="input" value={form.relationship} onChange={e => set('relationship', e.target.value)}>
          {RELATIONSHIP_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <input className="input" placeholder="Temporary Password" type="password" value={form.temporaryPassword} onChange={e => set('temporaryPassword', e.target.value)} />

        <button type="button" className="btn btn-primary btn-block" onClick={submit} disabled={submitting}>
          {submitting ? 'Adding…' : 'Add Guardian'}
        </button>
      </div>

      {message && <div className="card">{message}</div>}
    </Screen>
  );
}
