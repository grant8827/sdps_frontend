import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/AuthShell';

/**
 * Login by email/phone + password. On success, the router reads the
 * resulting user's role and routes to the matching Parent / Teacher /
 * Admin layout automatically. Ported from mobile_app's LoginScreen.
 *
 * Local demo accounts use admin@school.test, teacher@school.test, or
 * parent@school.test with password "password".
 */
export function LoginScreen() {
  const { login, isAuthenticating } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier || !password) {
      setError('Enter both email/phone and password.');
      return;
    }
    try {
      await login(identifier, password);
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <AuthShell>
      <form className="form-card" onSubmit={handleSubmit}>
        <h2 className="form-title">Welcome back</h2>
        <p className="form-subtitle">Sign in to continue to your dashboard.</p>

        <div className="field-group">
          <input
            className="input"
            placeholder="Email or phone"
            autoCapitalize="none"
            type="email"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
          />
        </div>
        <div className="field-group">
          <input
            className="input"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn btn-primary btn-block" disabled={isAuthenticating}>
          {isAuthenticating ? 'Logging in…' : 'Log In'}
        </button>
      </form>

      <p className="auth-switch">
        New school? <Link to="/register">Register your campus</Link>
      </p>

      <p className="login-footer">
        Parent, Teacher, and Admin accounts all sign in here — you'll land on the
        dashboard built for your role.
        {' '}Local demo password: password.
      </p>
    </AuthShell>
  );
}
