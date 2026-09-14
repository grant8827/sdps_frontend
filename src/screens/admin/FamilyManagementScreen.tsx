import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type Guardian } from '../../services/api';

type Tab = 'list' | 'register';

/** Admin Family Management: view/suspend/delete parents, and register new ones. Children get linked to a parent from the Students tab's registration form. */
export function FamilyManagementScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  const load = async () => {
    if (!token) return;
    setGuardians(await api.guardians(token));
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const registerParent = async () => {
    if (!token) return;
    setMessage('');
    if (!fullName.trim() || !email.trim() || !temporaryPassword) { setMessage('Full name, email, and a temporary password are required.'); return; }
    try {
      await api.addGuardian(token, { fullName, email, phone, temporaryPassword });
      setFullName(''); setPhone(''); setEmail(''); setTemporaryPassword('');
      setMessage('Parent registered.'); setTab('list'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not register parent'); }
  };

  const toggleSuspend = async (guardian: Guardian) => {
    if (!token) return;
    try { await api.setGuardianActive(token, guardian.id, !guardian.active); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update parent'); }
  };
  const remove = async (guardian: Guardian) => {
    if (!token || !window.confirm(`Delete ${guardian.fullName}? This removes their account and unlinks their children.`)) return;
    try { await api.deleteGuardian(token, guardian.id); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete parent'); }
  };

  return (
    <Screen title="Families" subtitle="Register parents and manage their accounts.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'list' ? ' subtab-active' : ''}`} onClick={() => setTab('list')}>Parents</button>
        <button type="button" className={`subtab${tab === 'register' ? ' subtab-active' : ''}`} onClick={() => setTab('register')}>Add Parent</button>
      </div>
      {message && <div className="card">{message}</div>}

      {tab === 'register' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-title" style={{ marginBottom: 0, fontSize: 15 }}>Add Parent</p>
          <input className="input" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <input className="input" placeholder="Phone Number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className="input" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input" placeholder="Temporary password" type="password" value={temporaryPassword} onChange={e => setTemporaryPassword(e.target.value)} />
          <p className="field-label">Children are linked to this parent from the Students tab's registration form.</p>
          <button type="button" className="btn btn-primary" onClick={registerParent}>Register Parent</button>
        </div>
      )}

      {tab === 'list' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Parent</th><th>Email</th><th>Phone</th><th>Children</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {guardians.map(guardian => (
                <tr key={guardian.id}>
                  <td>{guardian.fullName}</td>
                  <td>{guardian.email}</td>
                  <td>{guardian.phone || '—'}</td>
                  <td>{guardian.children.length ? guardian.children.map(c => c.fullName).join(', ') : 'None linked'}</td>
                  <td><span className="pill" style={{ backgroundColor: guardian.active ? 'var(--green)' : 'var(--red)' }}>{guardian.active ? 'Active' : 'Suspended'}</span></td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleSuspend(guardian)}>{guardian.active ? 'Suspend' : 'Reactivate'}</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(guardian)}>Delete</button>
                  </td>
                </tr>
              ))}
              {guardians.length === 0 && <tr><td colSpan={6} className="empty-text">No parents registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}
