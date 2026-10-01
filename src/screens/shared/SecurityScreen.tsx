import { useEffect, useState } from 'react';
import { MfaEnroll } from '../../components/MfaEnroll';
import { RecoveryCodes } from '../../components/RecoveryCodes';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type MfaStatus } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

type Mode = 'idle' | 'enrolling' | 'newCodes' | 'disabling';

/**
 * Security (every role): two-step verification status for this account.
 * Teachers and parents can turn it on (and off again, with their
 * password); for admin-dashboard accounts it's required, so it can't be
 * turned off here. Anyone with it on can replace their recovery codes.
 */
export function SecurityScreen() {
  const { token } = useAuth();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [input, setInput] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [message, setMessage] = useState('');

  const load = () => { if (token) api.myMfa(token).then(setStatus).catch(err => setMessage(err.message)); };
  useEffect(load, [token]);

  const reset = () => { setMode('idle'); setInput(''); setCodes(null); load(); };

  const replaceCodes = async () => {
    if (!token) return;
    try { setCodes((await api.myMfaNewRecoveryCodes(token, input)).recoveryCodes); setMessage(''); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Could not replace codes'); }
  };
  const disable = async () => {
    if (!token) return;
    try { await api.myMfaDisable(token, input); setMessage('Two-step verification is off.'); reset(); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Could not turn it off'); }
  };

  return (
    <Screen title="Security" subtitle="Protect your account with a code from your phone as well as your password.">
      {message && <div className="card">{message}</div>}
      {status && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
          <div className="card-row" style={{ gap: 8 }}>
            <p className="quick-action-title" style={{ margin: 0, fontSize: 16 }}>Two-step verification</p>
            <span className="pill" style={{ backgroundColor: status.enabled ? 'var(--green)' : 'var(--gray)' }}>{status.enabled ? 'On' : 'Off'}</span>
          </div>
          {status.enabled ? (
            <p style={{ margin: 0, fontSize: 14 }}>
              On since {status.enabledAt ? formatUtcTimestamp(status.enabledAt) : '—'}. {status.recoveryCodesLeft} recovery {status.recoveryCodesLeft === 1 ? 'code' : 'codes'} left.
              {status.required && ' Required for your account.'}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 14 }}>When it's on, signing in also needs a 6-digit code from an authenticator app on your phone.</p>
          )}

          {mode === 'idle' && !status.enabled && (
            <button type="button" className="btn btn-primary" onClick={() => { setMessage(''); setMode('enrolling'); }}>Turn on</button>
          )}
          {mode === 'enrolling' && token && (
            <MfaEnroll
              begin={() => api.myMfaSetup(token)}
              confirm={async code => (await api.myMfaConfirm(token, code)).recoveryCodes}
              onDone={() => { setMessage('Two-step verification is on.'); reset(); }}
            />
          )}

          {mode === 'idle' && status.enabled && (
            <div className="btn-row">
              <button type="button" className="btn btn-secondary" onClick={() => { setMessage(''); setMode('newCodes'); }}>New recovery codes</button>
              {!status.required && <button type="button" className="btn btn-danger" onClick={() => { setMessage(''); setMode('disabling'); }}>Turn off</button>}
            </div>
          )}
          {mode === 'newCodes' && (codes ? (
            <RecoveryCodes codes={codes} onDone={reset} doneLabel="Done" />
          ) : (
            <>
              <p className="field-label" style={{ margin: 0 }}>Your old recovery codes will stop working. Enter the current code from your authenticator app:</p>
              <input className="input" inputMode="numeric" maxLength={6} value={input} onChange={e => setInput(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" />
              <div className="btn-row">
                <button type="button" className="btn btn-primary" disabled={input.length !== 6} onClick={replaceCodes}>Get new codes</button>
                <button type="button" className="btn btn-secondary" onClick={reset}>Cancel</button>
              </div>
            </>
          ))}
          {mode === 'disabling' && (
            <>
              <p className="field-label" style={{ margin: 0 }}>Enter your password to turn off two-step verification:</p>
              <input className="input" type="password" value={input} onChange={e => setInput(e.target.value)} placeholder="Password" />
              <div className="btn-row">
                <button type="button" className="btn btn-danger" disabled={!input} onClick={disable}>Turn off</button>
                <button type="button" className="btn btn-secondary" onClick={reset}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}
    </Screen>
  );
}
