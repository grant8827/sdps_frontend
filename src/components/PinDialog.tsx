import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { PinInput, pinProblem } from './PinInput';

/**
 * The popup a parent sees when they tap Pick Up: enter their 6-digit
 * pickup PIN — or, the first time, create one (typed twice). "Forgot
 * PIN?" emails them a link to choose a new one. `onSubmit` rejects with
 * the server's message (wrong PIN, tries left, locked), shown here.
 */
export function PinDialog({ mode, childName, onSubmit, onForgot, onClose }: {
  mode: 'create' | 'enter';
  childName: string;
  onSubmit: (pin: string) => Promise<void>;
  onForgot: () => Promise<string>;
  onClose: () => void;
}) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Switching from "enter" to "create" (no PIN yet) starts clean.
  useEffect(() => { setPin(''); setConfirm(''); setError(''); }, [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = mode === 'create' ? pinProblem(pin, confirm) : (/^\d{6}$/.test(pin) ? null : 'Enter your 6-digit PIN.');
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await onSubmit(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPin('');
      setConfirm('');
      setBusy(false);
      firstRef.current?.focus();
    }
  };
  const forgot = async () => {
    setError('');
    try { setNotice(await onForgot()); } catch (err) { setError(err instanceof Error ? err.message : 'Could not send the email'); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()} onSubmit={submit}>
        <p id={titleId} className="form-title" style={{ margin: 0 }}>{mode === 'create' ? 'Create your pickup PIN' : 'Enter your pickup PIN'}</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          {mode === 'create'
            ? `Choose a 6-digit PIN that only you know. You'll enter it each time you request a pickup. Then we'll send the pickup request for ${childName}.`
            : `To request the pickup for ${childName}.`}
        </p>
        <PinInput id={`${titleId}-pin`} inputRef={firstRef} value={pin} onChange={setPin} label={mode === 'create' ? 'New PIN (6 digits)' : 'PIN'} />
        {mode === 'create' && <PinInput id={`${titleId}-confirm`} value={confirm} onChange={setConfirm} label="Type it again" />}
        {error && <p className="form-error" role="alert" style={{ margin: 0 }}>{error}</p>}
        {notice && <p className="form-success" role="status" style={{ margin: 0 }}>{notice}</p>}
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : mode === 'create' ? 'Save PIN and request pickup' : 'Request pickup'}</button>
        </div>
        {mode === 'enter' && <button type="button" className="link-button" style={{ alignSelf: 'center' }} onClick={forgot}>Forgot PIN?</button>}
      </form>
    </div>
  );
}
