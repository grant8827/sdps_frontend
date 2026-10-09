import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { PinInput, pinProblem } from '../../components/PinInput';
import { api } from '../../services/api';

/**
 * Where the "Forgot PIN?" email link lands (/set-pin?token=…): choose a
 * new 6-digit pickup PIN. Checks the link first, so an expired one says
 * so. The password is not changed and the parent stays signed in.
 */
export function SetPinScreen() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [name, setName] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(token ? null : 'This link is missing its code. Open the link from your email again.');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.checkAccountLink(token)
      .then(link => (link.purpose === 'PIN_RESET' ? setName(link.fullName) : setLinkError('This link is not a pickup PIN link.')))
      .catch(err => setLinkError(err instanceof Error ? err.message : 'This link could not be checked.'));
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = pinProblem(pin, confirm);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError('');
    try {
      await api.setPinFromLink(token, pin);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <div className="form-card">
        {done ? (
          <>
            <h2 className="form-title">Your pickup PIN is set</h2>
            <p className="form-success" role="status">Use your new PIN the next time you request a pickup, in the app or on the website.</p>
            <Link to="/" className="btn btn-primary btn-block">Continue</Link>
          </>
        ) : linkError ? (
          <>
            <h2 className="form-title">This link can't be used</h2>
            <p className="form-error" role="alert" style={{ margin: '0 0 16px' }}>{linkError}</p>
            <p className="form-subtitle">Links work once and expire after an hour. Tap "Forgot PIN?" again where you request a pickup to get a new one.</p>
            <Link to="/" className="btn btn-primary btn-block">Back to SDPMPlus</Link>
          </>
        ) : name === null ? (
          <div className="spinner" />
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="form-title" style={{ marginBottom: 0 }}>Choose a new pickup PIN</h2>
            <p className="form-subtitle" style={{ marginBottom: 4 }}>{name}, this is the 6-digit PIN you enter each time you request a pickup. Your password stays the same.</p>
            <PinInput id="new-pin" value={pin} onChange={setPin} label="New PIN (6 digits)" />
            <PinInput id="confirm-pin" value={confirm} onChange={setConfirm} label="Type it again" />
            {error ? <p className="form-error" style={{ margin: 0 }}>{error}</p> : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Save PIN'}</button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
