import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import type { MfaEnrollment } from '../services/api';
import { RecoveryCodes } from './RecoveryCodes';

/**
 * Setting up an authenticator app: scan the QR code (or type the key),
 * then enter the 6-digit code it shows to prove it works. `begin` and
 * `confirm` are the sign-in or the signed-in variants of the same API.
 * After a successful confirm, shows the recovery codes and calls onDone
 * once the user says they've saved them.
 */
export function MfaEnroll({ begin, confirm, onDone, onError }: {
  begin: () => Promise<MfaEnrollment>;
  confirm: (code: string) => Promise<string[]>;
  onDone: () => void;
  onError?: (error: unknown) => void;
}) {
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  useEffect(() => {
    begin()
      .then(async next => {
        setEnrollment(next);
        setQr(await QRCode.toDataURL(next.otpauthUri, { margin: 1, width: 200 }));
      })
      .catch(err => { setError(err instanceof Error ? err.message : 'Could not start setup'); onError?.(err); });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try { setRecoveryCodes(await confirm(code)); }
    catch (err) { setError(err instanceof Error ? err.message : 'That code did not work'); setCode(''); onError?.(err); }
    finally { setBusy(false); }
  };

  if (recoveryCodes) return <RecoveryCodes codes={recoveryCodes} onDone={onDone} />;

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <li>Install an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, 1Password, …).</li>
        <li>In the app, add an account and scan this QR code.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      <div style={{ display: 'flex', justifyContent: 'center', minHeight: 200 }}>
        {qr ? <img src={qr} alt="QR code for your authenticator app" width={200} height={200} style={{ background: '#fff', borderRadius: 8 }} /> : <p className="field-label">Loading…</p>}
      </div>
      {enrollment && (
        <p className="field-label" style={{ margin: 0, textAlign: 'center', wordBreak: 'break-all' }}>
          Can't scan? Enter this key in the app:<br />
          <strong style={{ fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: 1 }}>{enrollment.secret.match(/.{1,4}/g)?.join(' ')}</strong>
        </p>
      )}
      <input
        className="input"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="6-digit code"
        maxLength={6}
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        style={{ fontSize: 20, letterSpacing: 4, textAlign: 'center' }}
      />
      {error ? <p className="form-error" style={{ margin: 0 }}>{error}</p> : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy || code.length !== 6 || !enrollment}>
        {busy ? 'Checking…' : 'Turn on two-step verification'}
      </button>
    </form>
  );
}
