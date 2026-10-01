import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../services/api';
import type { AuthSession, MfaChallenge } from '../types';
import { MfaEnroll } from './MfaEnroll';

/**
 * The second step of signing in, after a correct password: either enter
 * the code from the authenticator app (or a recovery code), or — for an
 * account that must use two-step verification and hasn't yet — set it up
 * now. Calls onSignedIn with the finished session; onRestart when the
 * half-finished sign-in has expired or had too many wrong codes, so the
 * password has to be entered again.
 */
export function MfaSignInStep({ challenge, onSignedIn, onRestart }: {
  challenge: MfaChallenge;
  onSignedIn: (session: AuthSession) => void;
  onRestart: (message: string) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<AuthSession | null>(null);

  const restartIfExpired = (err: unknown) => {
    if (err instanceof ApiError && err.status === 410) onRestart(err.message);
  };

  if (challenge.mfaSetupRequired) {
    return (
      <>
        <h2 className="form-title">Set up two-step verification</h2>
        <p className="form-subtitle">Your account protects student information, so it needs a code from your phone as well as your password.</p>
        <MfaEnroll
          begin={() => api.mfaSetup(challenge.mfaToken)}
          confirm={async value => {
            const result = await api.mfaSetupConfirm(challenge.mfaToken, value);
            const { recoveryCodes, ...session } = result;
            setPendingSession(session);
            return recoveryCodes;
          }}
          onDone={() => { if (pendingSession) onSignedIn(pendingSession); }}
          onError={restartIfExpired}
        />
      </>
    );
  }

  if (notice && pendingSession) {
    return (
      <>
        <h2 className="form-title">Recovery code used</h2>
        <p className="form-subtitle">{notice}</p>
        <button type="button" className="btn btn-primary btn-block" onClick={() => onSignedIn(pendingSession)}>Continue</button>
      </>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { recoveryCodesLeft, ...session } = await api.mfaVerify(challenge.mfaToken, code);
      if (recoveryCodesLeft !== undefined) {
        setPendingSession(session);
        setNotice(`You signed in with a recovery code. You have ${recoveryCodesLeft} left — if your phone is lost, set up two-step verification again from the Security page or ask an administrator to reset it.`);
        return;
      }
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work');
      setCode('');
      restartIfExpired(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h2 className="form-title">Enter your code</h2>
      <p className="form-subtitle">Open your authenticator app and enter the 6-digit code for School Drop-off &amp; Pick-up. Lost your phone? Enter one of your recovery codes instead.</p>
      <div className="field-group">
        <input
          className="input"
          autoFocus
          autoComplete="one-time-code"
          placeholder="6-digit code or recovery code"
          maxLength={11}
          value={code}
          onChange={e => setCode(e.target.value.trim())}
          style={{ fontSize: 20, letterSpacing: 3, textAlign: 'center' }}
        />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Verify'}</button>
    </form>
  );
}
