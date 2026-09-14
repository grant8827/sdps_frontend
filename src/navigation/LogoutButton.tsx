import { useAuth } from '../context/AuthContext';

/** Shown in the top bar of every role layout so any session can be ended. */
export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button type="button" className="logout-btn" onClick={() => logout()}>
      Log Out
    </button>
  );
}
