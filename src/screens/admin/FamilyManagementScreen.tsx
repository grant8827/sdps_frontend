import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { InviteResult } from '../../components/InviteResult';
import { useAuth } from '../../context/AuthContext';
import { api, type Guardian, type GuardianRequest, type InviteResult as InviteResultData } from '../../services/api';
import { GuardianRequestsPanel } from './GuardianRequestsPanel';

type Tab = 'list' | 'register' | 'approvals';

/**
 * Admin Family Management: view/suspend/delete parents, register new ones,
 * and approve adults that parents asked to have authorized. Children get
 * linked to a parent from the Students tab's registration form. A new
 * parent gets an email link to choose their own password.
 */
export function FamilyManagementScreen() {
  const { token, canManageSchool } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [requests, setRequests] = useState<GuardianRequest[]>([]);
  const [message, setMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [invite, setInvite] = useState<{ name: string; result: InviteResultData } | null>(null);

  const load = async () => {
    if (!token) return;
    setGuardians(await api.guardians(token));
    if (canManageSchool) setRequests(await api.guardianRequests(token));
  };
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const registerParent = async () => {
    if (!token) return;
    setMessage(''); setInvite(null);
    if (!fullName.trim() || !email.trim()) { setMessage('Full name and email are required.'); return; }
    try {
      const result = await api.addGuardian(token, { fullName, email, phone });
      setInvite({ name: fullName.trim(), result });
      setFullName(''); setPhone(''); setEmail('');
      setMessage(result.emailSent === undefined ? `${fullName.trim()} already had an account and was added to this school. We let them know by email.` : 'Parent registered.');
      setTab('list'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not register parent'); }
  };

  const toggleSuspend = async (guardian: Guardian) => {
    if (!token) return;
    try { await api.setGuardianActive(token, guardian.id, !guardian.active); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update parent'); }
  };
  const sendLink = async (guardian: Guardian) => {
    if (!token) return;
    setMessage(''); setInvite(null);
    try { setInvite({ name: guardian.fullName, result: await api.sendAccountLink(token, guardian.userId) }); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not send the link'); }
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
        {canManageSchool && <button type="button" className={`subtab${tab === 'register' ? ' subtab-active' : ''}`} onClick={() => setTab('register')}>Add Parent</button>}
        {canManageSchool && (
          <button type="button" className={`subtab${tab === 'approvals' ? ' subtab-active' : ''}`} onClick={() => setTab('approvals')}>
            Pending Approvals{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        )}
      </div>
      {message && <div className="card">{message}</div>}
      {invite && <InviteResult name={invite.name} result={invite.result} onDismiss={() => setInvite(null)} />}

      {tab === 'register' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-title" style={{ marginBottom: 0, fontSize: 15 }}>Add Parent</p>
          <input className="input" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <input className="input" placeholder="Phone Number" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          <input className="input" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <p className="field-label">They'll get an email with a link to choose their own password. Children are linked to this parent from the Students tab's registration form.</p>
          <button type="button" className="btn btn-primary" onClick={registerParent}>Register Parent</button>
        </div>
      )}

      {tab === 'approvals' && <GuardianRequestsPanel requests={requests} onChanged={load} />}

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
                    {canManageSchool ? (
                      <>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleSuspend(guardian)}>{guardian.active ? 'Suspend' : 'Reactivate'}</button>
                        {guardian.active && (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => sendLink(guardian)}>{guardian.needsSetup ? 'Resend invite' : 'Email reset link'}</button>
                        )}
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(guardian)}>Delete</button>
                      </>
                    ) : '—'}
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
