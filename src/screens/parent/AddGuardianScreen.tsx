import { useEffect, useState } from 'react';
import { GuardianRequestStatusPill } from '../../components/GuardianRequestStatusPill';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type MyGuardians } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

const RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Sibling', 'Guardian', 'Other'];
const emptyForm = { fullName: '', email: '', phone: '', relationship: 'Grandmother', temporaryPassword: '' };

/**
 * Lets a parent ask for another adult (e.g. the other parent, or a
 * grandparent) to be authorized for drop-off/pick-up of every child this
 * parent manages. Nothing is granted right away: the school admin
 * approves or rejects it (Families → Pending Approvals), and the parent
 * gets a message either way. Below the form, the parent sees who is
 * already authorized and where each request stands.
 */
export function AddGuardianScreen() {
  const { token } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [guardians, setGuardians] = useState<MyGuardians>({ authorized: [], requests: [] });

  const loadGuardians = () => {
    if (token) api.myGuardians(token).then(setGuardians).catch(() => {});
  };
  useEffect(loadGuardians, [token]);

  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!token) return;
    setMessage('');
    if (!form.fullName.trim() || !form.email.trim() || !form.temporaryPassword) {
      setMessage('Name, email, and a temporary password are required.');
      return;
    }
    if (form.temporaryPassword.length < 8) {
      setMessage('The temporary password must be at least 8 characters.');
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
      setMessage(`Request sent. The school will review it, and you'll get a message once ${form.fullName.trim()} is approved. Until then they can't drop off or pick up. You can share their email and temporary password with them now.`);
      setForm(emptyForm);
      loadGuardians();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add guardian');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Add Guardian" subtitle="Ask the school to authorize another parent or family member to drop off/pick up your children.">
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
          {submitting ? 'Sending…' : 'Send for Approval'}
        </button>
      </div>

      {message && <div className="card">{message}</div>}

      {guardians.requests.length > 0 && (
        <div className="card">
          <p className="form-title" style={{ marginTop: 0 }}>Your requests</p>
          {guardians.requests.map(request => (
            <div key={request.batchId} style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <div className="card-row" style={{ gap: 8 }}>
                <strong>{request.fullName}</strong>
                <GuardianRequestStatusPill status={request.status} />
              </div>
              <p className="field-label" style={{ margin: '4px 0 0' }}>
                {request.relationship} · for {request.students.join(', ')} · asked {formatUtcTimestamp(request.requestedAt)}
              </p>
              {request.decisionNote && <p className="field-label" style={{ margin: '4px 0 0' }}>School's note: {request.decisionNote}</p>}
            </div>
          ))}
        </div>
      )}

      {guardians.authorized.length > 0 && (
        <div className="card">
          <p className="form-title" style={{ marginTop: 0 }}>Adults authorized for your children</p>
          {guardians.authorized.map(adult => (
            <div key={adult.guardianId} style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
              <strong>{adult.fullName}</strong>
              <p className="field-label" style={{ margin: '4px 0 0' }}>
                {adult.relationship} · {adult.students.join(', ')}{adult.canPickUp ? '' : ' · not allowed to pick up'}
              </p>
            </div>
          ))}
        </div>
      )}
    </Screen>
  );
}
