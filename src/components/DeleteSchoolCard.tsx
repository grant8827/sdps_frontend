import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PasswordInput } from './PasswordInput';
import { useAuth } from '../context/AuthContext';
import { api, type SchoolDeletionRequest } from '../services/api';

const STATUS: Record<string, string> = { REQUESTED: 'Received', UNDER_REVIEW: 'Being reviewed', APPROVED: 'Approved', PROCESSING: 'Being carried out' };
const day = (stamp: string) => new Date(`${stamp.replace(' ', 'T')}Z`).toLocaleDateString();

/**
 * Profile → Delete school account (school administrators only). Sends a
 * request to delete the whole school to the SDPMPlus team, who carry it
 * out within 30 days; the school keeps working until then, and the
 * request can be withdrawn while it is being reviewed.
 */
export function DeleteSchoolCard() {
  const { token, schools, activeSchoolId } = useAuth();
  const schoolName = (schools.find(s => s.schoolId === activeSchoolId) ?? schools[0])?.schoolName ?? '';
  const [request, setRequest] = useState<SchoolDeletionRequest | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.schoolDeletionRequest(token).then(result => setRequest(result.request)).catch(() => setRequest(null));
  }, [token, activeSchoolId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (confirmName.trim().toLowerCase() !== schoolName.trim().toLowerCase()) { setMessage(`Type the school's name, ${schoolName}, to confirm.`); return; }
    if (!password) { setMessage('Enter your password.'); return; }
    setBusy(true);
    setMessage('');
    try {
      const result = await api.requestSchoolDeletion(token, { confirmName, password, reason: reason.trim() || undefined });
      setRequest(result.request);
      setOpen(false);
      setConfirmName(''); setPassword(''); setReason('');
      setMessage('Your request to delete the school has been sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send the request');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!token || !window.confirm('Withdraw the request to delete this school? Nothing will be deleted.')) return;
    setBusy(true);
    setMessage('');
    try {
      await api.withdrawSchoolDeletion(token);
      setRequest(null);
      setMessage('Request withdrawn. Your school will not be deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not withdraw the request');
    } finally {
      setBusy(false);
    }
  };

  if (request === undefined) return null;
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520, borderLeft: '4px solid var(--red)' }}>
      <p className="form-title" style={{ margin: 0 }}>Delete school account</p>
      {request ? (
        <>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            {request.requesterName} asked for <strong>{schoolName}</strong> to be deleted on {day(request.createdAt)}. Status: <strong>{STATUS[request.status] ?? request.status}</strong>.
            The SDPMPlus team will complete it by {day(request.dueAt)}. Until then everything keeps working.
          </p>
          <p className="field-label" style={{ margin: 0 }}>Download anything you want to keep from <Link to="/admin/data">Data &amp; Privacy</Link> before then.</p>
          {request.canWithdraw
            ? <div><button type="button" className="btn btn-secondary" disabled={busy} onClick={withdraw}>Withdraw request</button></div>
            : <p className="field-label" style={{ margin: 0 }}>The request has been approved and can no longer be withdrawn here. Contact SDPMPlus support if this is a mistake.</p>}
        </>
      ) : !open ? (
        <>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
            Permanently delete <strong>{schoolName}</strong> and everything in it: students, parents, teachers and staff accounts, classes, attendance, messages and photos. This can&apos;t be undone.
          </p>
          <div><button type="button" className="btn btn-danger" onClick={() => { setOpen(true); setMessage(''); }}>Delete school account…</button></div>
        </>
      ) : (
        <form style={{ display: 'flex', flexDirection: 'column', gap: 10 }} onSubmit={submit}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.5 }}>
            <li>Your request goes to the SDPMPlus team, who delete the school within 30 days.</li>
            <li>Until then the school keeps working, so you can download your data from Data &amp; Privacy.</li>
            <li>You can withdraw the request here while it is being reviewed.</li>
            <li>Once deleted, every account, student record, class, attendance record, message and photo is gone for good. Cancel your subscription separately under Upgrade Plan.</li>
          </ul>
          <label className="field-label" style={{ margin: 0 }} htmlFor="delete-school-name">Type <strong>{schoolName}</strong> to confirm</label>
          <input id="delete-school-name" className="input" autoComplete="off" value={confirmName} onChange={e => setConfirmName(e.target.value)} />
          <PasswordInput placeholder="Your password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          <textarea className="textarea" placeholder="Why are you leaving? (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          <div className="btn-row">
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { setOpen(false); setMessage(''); }}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={busy}>{busy ? 'Sending…' : 'Request deletion'}</button>
          </div>
        </form>
      )}
      {message && <p role="status" style={{ margin: 0, fontSize: 14 }}>{message}</p>}
    </div>
  );
}
