import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { api } from '../../services/api';

/**
 * "Forgot password?" — asks for the sign-in email and has the server
 * email a one-hour reset link. The answer is the same whether or not the
 * email has an account, so this page can't be used to find out who's
 * registered.
 */
export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Enter the email address you sign in with.'); return; }
    setBusy(true);
    try {
      setSentMessage((await api.forgotPassword(email.trim())).message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="form-title">Reset your password</h2>
        {sentMessage ? (
          <>
            <p className="form-success" role="status">{sentMessage}</p>
            <p className="form-subtitle">The link works for 1 hour. If nothing arrives in a few minutes, check the address and try again, or ask your school office.</p>
            <Link to="/login" className="btn btn-primary btn-block">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="form-subtitle">Enter the email you sign in with and we'll send you a link to choose a new password.</p>
            <div className="field-group">
              <input className="input" placeholder="Email" type="email" autoCapitalize="none" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
      </form>
      <p className="auth-switch">Remembered it? <Link to="/login">Sign in</Link></p>
    </AuthShell>
  );
}
