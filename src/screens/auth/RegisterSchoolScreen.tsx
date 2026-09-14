import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/AuthShell';
import { api } from '../../services/api';

const emptyForm = {
  schoolName: '',
  campusName: '',
  campusAddress: '',
  adminFullName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

/**
 * Public self-service signup: a brand-new school registers its first
 * campus and its own admin account in one step. On success the backend
 * signs them straight in (see api.registerSchool), so this just adopts
 * that session and the router takes it from there to /admin.
 */
export function RegisterSchoolScreen() {
  const { adoptSession } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      const session = await api.registerSchool({
        schoolName: form.schoolName,
        campusName: form.campusName,
        campusAddress: form.campusAddress || undefined,
        adminFullName: form.adminFullName,
        email: form.email,
        password: form.password,
      });
      await adoptSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register your school. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
          {submitting ? 'Setting up your school…' : 'Register School'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
