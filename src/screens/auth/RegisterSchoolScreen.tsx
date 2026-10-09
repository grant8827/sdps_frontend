import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/AuthShell';
import { MfaSignInStep } from '../../components/MfaSignInStep';
import { api, ApiError } from '../../services/api';
import { LogoPicker } from '../../components/LogoPicker';
import { isMfaChallenge, type MfaChallenge } from '../../types';

const emptyForm = {
  schoolName: '',
  campusName: '',
  campusAddress: '',
  adminFullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  logoDataUrl: '',
};

/**
 * Public self-service signup: a brand-new school registers its first
 * campus and its own admin account in one step. Admins must use two-step
 * verification, so the backend answers with a setup challenge: the new
 * admin sets up their authenticator app here (MfaSignInStep), and the
 * resulting session takes them on to /admin.
 */
export function RegisterSchoolScreen() {
  const { adoptSession } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<MfaChallenge | null>(null);
  // After the form is filled in, the email address is confirmed with a
  // 6-digit code sent to it; `codeStep` is that second screen.
  const [codeStep, setCodeStep] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [notice, setNotice] = useState('');

  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.schoolName.trim() || !form.campusName.trim() || !form.adminFullName.trim() || !form.email.trim() || !form.password) {
      setError('School name, campus name, your name, email, and password are all required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const sent = await api.sendRegistrationCode(form.email.trim());
      if (sent.required) {
        setEmailCode('');
        setNotice('');
        setCodeStep(true);
      } else {
        await register();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the confirmation code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const register = async (code?: string) => {
    const result = await api.registerSchool({
      schoolName: form.schoolName,
      campusName: form.campusName,
      campusAddress: form.campusAddress || undefined,
      adminFullName: form.adminFullName,
      email: form.email.trim(),
      password: form.password,
      logoDataUrl: form.logoDataUrl || undefined,
      emailCode: code,
    });
    if (isMfaChallenge(result)) setChallenge(result);
    else await adoptSession(result);
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice('');
    if (!/^\d{6}$/.test(emailCode)) { setError('Enter the 6-digit code from the email.'); return; }
    setSubmitting(true);
    try {
      await register(emailCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register your school. Please try again.');
      // A problem with the code keeps them here; anything else (a field
      // the server refused) sends them back to the form to fix it.
      if (err instanceof ApiError && err.code?.startsWith('EMAIL_CODE_')) setEmailCode('');
      else setCodeStep(false);
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setNotice('');
    setSubmitting(true);
    try {
      await api.sendRegistrationCode(form.email.trim());
      setEmailCode('');
      setNotice('A new code is on its way. Only the newest code works.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a new code.');
    } finally {
      setSubmitting(false);
    }
  };

  if (challenge) {
    return (
      <AuthShell>
        <div className="form-card">
          <p className="form-subtitle" style={{ color: 'var(--green)' }}>Your school is registered. One last step:</p>
          <MfaSignInStep
            challenge={challenge}
            onSignedIn={adoptSession}
            onRestart={message => { setChallenge(null); setError(`${message} Your school was created — sign in from the login page to finish.`); }}
          />
        </div>
      </AuthShell>
    );
  }

  if (codeStep) {
    return (
      <AuthShell>
        <form className="form-card" onSubmit={submitCode}>
          <h2 className="form-title">Confirm your email</h2>
          <p className="form-subtitle">We emailed a 6-digit code to <strong>{form.email.trim()}</strong>. Enter it to finish registering {form.schoolName.trim()}.</p>
          <div className="field-group">
            <input
              className="input pin-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit code"
              placeholder="000000"
              autoFocus
              value={emailCode}
              onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <p className="field-hint" style={{ marginBottom: 12 }}>The code works for 10 minutes. Check your spam folder if it hasn't arrived.</p>

          {notice ? <p className="field-hint" role="status" style={{ marginBottom: 12 }}>{notice}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Please wait…' : 'Confirm and register'}
          </button>
          <div className="action-row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <button type="button" className="link-button" onClick={resendCode} disabled={submitting}>Send a new code</button>
            <button type="button" className="link-button" onClick={() => { setCodeStep(false); setError(null); }} disabled={submitting}>Change details</button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="form-title">Register your school</h2>
        <p className="form-subtitle">Set up your campus and admin account — you'll land straight in your dashboard.</p>

        <div className="field-group">
          <input className="input" placeholder="School name" value={form.schoolName} onChange={e => set('schoolName', e.target.value)} />
        </div>
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <input className="input" placeholder="Campus name" value={form.campusName} onChange={e => set('campusName', e.target.value)} />
          <input className="input" placeholder="Campus address (optional)" value={form.campusAddress} onChange={e => set('campusAddress', e.target.value)} />
        </div>

        <p className="field-label" style={{ margin: '4px 0 8px' }}>School logo (optional)</p>
        <div className="field-group">
          <LogoPicker value={form.logoDataUrl} onChange={dataUrl => set('logoDataUrl', dataUrl)} disabled={submitting} />
          <p className="field-hint" style={{ margin: '6px 0 0' }}>Shown on the dashboard for your parents, teachers and staff. You can add or change it later in School Setup.</p>
        </div>

        <p className="field-label" style={{ margin: '4px 0 8px' }}>Your admin account</p>
        <div className="field-group">
          <input className="input" placeholder="Your full name" value={form.adminFullName} onChange={e => set('adminFullName', e.target.value)} />
        </div>
        <div className="field-group">
          <input className="input" placeholder="Email" type="email" autoCapitalize="none" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="btn-row" style={{ marginBottom: 4 }}>
          <input className="input" placeholder="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} />
          <input className="input" placeholder="Confirm password" type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
        </div>
        <p className="field-hint" style={{ marginBottom: 12 }}>At least 8 characters.</p>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Please wait…' : 'Register School'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
