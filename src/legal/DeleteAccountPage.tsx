import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { PublicNavbar } from '../marketing/PublicNavbar';
import { api } from '../services/api';

/**
 * /delete-account — the account-deletion link the app stores ask for.
 * Readable whether or not you're signed in. The account holder confirms
 * with their sign-in details; the request joins the platform's
 * Compliance → Data Requests queue and is carried out within 30 days.
 */
export function DeleteAccountPage() {
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState<{ alreadyRequested: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Delete your account · SDPMPlus';
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) { setError('Enter the email or phone number you sign in with, and your password.'); return; }
    if (!confirmed) { setError('Tick the box to confirm you want your account deleted.'); return; }
    setBusy(true);
    try {
      setDone(await api.requestAccountDeletion({ identifier: identifier.trim(), password, reason: reason.trim() || undefined }));
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="public-page">
      {user ? (
        <header className="public-nav">
          <div className="public-nav-inner">
            <Link to="/" className="topbar-brand"><BrandLogo height={44} /></Link>
            <Link to="/" className="nav-login-link">← Back to your dashboard</Link>
          </div>
        </header>
      ) : <PublicNavbar />}
      <main className="legal-page">
        <article className="legal-article">
          <h1>Delete your SDPMPlus account</h1>
          <p>
            This page is for parents, guardians, teachers and school staff who use the SDPMPlus app (iPhone, Android or web)
            and want their account and its personal information deleted.
          </p>

          <h2>How it works</h2>
          <ol>
            <li>Enter the email or phone number and password you sign in with below, and submit the request.</li>
            <li>Our team checks the request with your school and deletes your account <strong>within 30 days</strong>.</li>
            <li>Until then you can still sign in. After deletion you can no longer sign in, and the app can't be used with this account.</li>
          </ol>

          <h2>What is deleted</h2>
          <ul>
            <li>Your account: name, email address, phone number, password, pickup PIN and two-step verification settings.</li>
            <li>Your profile photo and your link to your school(s) and to any students you were authorized to drop off or pick up.</li>
            <li>Your sign-in sessions on every device.</li>
          </ul>

          <h2>What is kept, and for how long</h2>
          <ul>
            <li>
              <strong>The school's audit log</strong> — the record of drop-offs, pick-ups and other actions, which schools need for student safety —
              is kept, along with the record that this deletion happened. Schools keep these records for the period set in their
              retention settings; see our <Link to="/legal/data-retention">Data Retention &amp; Deletion Policy</Link>.
            </li>
            <li>
              <strong>Students' records</strong> belong to their school and aren't deleted with a parent's account. To have a child's records
              deleted, ask your school.
            </li>
          </ul>
          <p>
            Read more in our <Link to="/legal/privacy-policy">Privacy Policy</Link>.
          </p>

          <h2 id="request">Request deletion</h2>
          {done ? (
            <p className="form-success" role="status">
              {done.alreadyRequested
                ? 'A request to delete this account is already open. We will finish it within 30 days of when it was made.'
                : 'Your request has been received. Your account will be deleted within 30 days.'}
            </p>
          ) : (
            <form className="form-card" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
              <div className="field-group">
                <input className="input" placeholder="Email or phone number" autoCapitalize="none" autoComplete="username"
                  value={identifier} onChange={e => setIdentifier(e.target.value)} />
              </div>
              <div className="field-group">
                <input className="input" placeholder="Password" type="password" autoComplete="current-password"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="field-group">
                <textarea className="input" placeholder="Why are you leaving? (optional)" rows={3} maxLength={2000}
                  value={reason} onChange={e => setReason(e.target.value)} />
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: 4 }} />
                <span>I understand my account will be permanently deleted and can't be recovered.</span>
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Sending…' : 'Request account deletion'}
              </button>
              <p className="form-subtitle" style={{ marginTop: 12 }}>
                Forgot your password? <Link to="/forgot-password">Reset it</Link> first, or ask your school office to request deletion for you.
              </p>
            </form>
          )}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
