import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthShell } from '../../components/AuthShell';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

type LinkInfo = { purpose: 'INVITE' | 'RESET'; fullName: string; email: string };

/**
 * Where emailed links land (/set-password?token=…): a new account's
 * invite, or a password reset. Checks the link first so an expired one
 * says so instead of showing a form that can't work. Choosing the
 * password signs the account out everywhere, so a visitor who was
 * signed in on this browser is signed out when they go on to sign in.
 */
export function SetPasswordScreen() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [linkError, setLinkError] = useState<string | null>(token ? null : 'This link is missing its code. Open the link from your email again.');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneEmail, setDoneEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.checkAccountLink(token)
      // A "Forgot PIN?" link opened on this page can't set a password.
      .then(link => (link.purpose === 'PIN_RESET' ? setLinkError('This link is for your pickup PIN, not your password.') : setInfo({ ...link, purpose: link.purpose })))
      .catch(err => setLinkError(err instanceof Error ? err.message : 'This link could not be checked.'));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError("The two passwords don't match."); return; }
    setBusy(true);
    try {
      const { email } = await api.setPassword(token, password);
      setDoneEmail(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const isInvite = info?.purpose === 'INVITE';
  const goToSignIn = async () => {
    if (user) await logout();
    navigate('/login');
  };

  return (
    <AuthShell>
      <div className="form-card">
        {doneEmail ? (
          <>
            <h2 className="form-title">{isInvite ? 'Your account is ready' : 'Password changed'}</h2>
            <p className="form-success" role="status">Sign in with {doneEmail} and your new password, on the web or in the SDPMPlus app.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={goToSignIn}>Sign in</button>
          </>
        ) : linkError ? (
          <>
            <h2 className="form-title">This link can't be used</h2>
            <p className="form-error" role="alert" style={{ margin: '0 0 16px' }}>{linkError}</p>
            <p className="form-subtitle">Links work once and expire. Ask for a new password reset link, or ask your school to send a new invite.</p>
            <Link to="/forgot-password" className="btn btn-primary btn-block">Get a new link</Link>
          </>
        ) : !info ? (
          <div className="spinner" />
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="form-title">{isInvite ? `Welcome, ${info.fullName}` : 'Choose a new password'}</h2>
            <p className="form-subtitle">
              {isInvite ? 'Choose a password to finish setting up your account' : 'Choose a new password'} for {info.email}.
            </p>
            {/* Lets password managers save the new password against the right account. */}
            <input type="email" value={info.email} autoComplete="username" readOnly hidden />
            <div className="field-group">
              <input className="input" placeholder="New password (at least 8 characters)" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="field-group">
              <input className="input" placeholder="Type it again" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Saving…' : isInvite ? 'Set up my account' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
