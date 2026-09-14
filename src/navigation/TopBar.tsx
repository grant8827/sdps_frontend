import { LogoutButton } from './LogoutButton';

/** Persistent app bar shown above every role's tabs, mirroring the RN navigators' headerRight. */
export function TopBar() {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-badge">🏫</span>
        <span>School Drop-off &amp; Pick-up</span>
      </div>
      <LogoutButton />
    </header>
  );
}
