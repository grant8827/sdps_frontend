import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PinInput, pinProblem } from './PinInput';

/**
 * Security page, parents only: the pickup PIN — create it (if they
 * haven't yet), change it (needs the current PIN), or get a "Forgot
 * PIN?" email.
 */
export function PickupPinCard() {
  const { token } = useAuth();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [current, setCurrent] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (token) api.myPin(token).then(r => setHasPin(r.hasPin)).catch(() => {}); }, [token]);
  if (hasPin === null) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setMessage('');
    const problem = (hasPin && !/^\d{6}$/.test(current)) ? 'Enter your current 6-digit PIN.' : pinProblem(pin, confirm);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError('');
    try {
      if (hasPin) await api.changePin(token, current, pin); else await api.createPin(token, pin);
      setMessage(hasPin ? 'Your pickup PIN was changed.' : 'Your pickup PIN is set.');
      setHasPin(true);
      setCurrent(''); setPin(''); setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the PIN');
      setCurrent('');
    } finally {
      setBusy(false);
    }
  };
  const forgot = async () => {
    if (!token) return;
    setError(''); setMessage('');
    try { setMessage((await api.forgotPin(token)).message); } catch (err) { setError(err instanceof Error ? err.message : 'Could not send the email'); }
  };

  return (
    <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520 }} onSubmit={submit}>
      <div className="card-row" style={{ gap: 8 }}>
        <p className="quick-action-title" style={{ margin: 0, fontSize: 16 }}>Pickup PIN</p>
        <span className="pill" style={{ backgroundColor: hasPin ? 'var(--green)' : 'var(--amber)', color: hasPin ? undefined : 'var(--on-amber)' }}>{hasPin ? 'Set' : 'Not set'}</span>
      </div>
      <p style={{ margin: 0, fontSize: 14 }}>
        The 6-digit PIN you enter each time you request a pickup. Keep it to yourself: it shows the request really came from you.
      </p>
      {hasPin && <PinInput id="pin-current" value={current} onChange={setCurrent} label="Current PIN" />}
      <PinInput id="pin-new" value={pin} onChange={setPin} label={hasPin ? 'New PIN (6 digits)' : 'PIN (6 digits)'} />
      <PinInput id="pin-confirm" value={confirm} onChange={setConfirm} label="Type it again" />
      {error && <p className="form-error" role="alert" style={{ margin: 0 }}>{error}</p>}
      {message && <p className="form-success" role="status" style={{ margin: 0 }}>{message}</p>}
      <div className="action-row">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : hasPin ? 'Change PIN' : 'Create PIN'}</button>
        {hasPin && <button type="button" className="link-button" onClick={forgot}>Forgot PIN?</button>}
      </div>
    </form>
  );
}
