import { LogoutButton } from './LogoutButton';

/** Persistent app bar shown above every role's tabs, mirroring the RN navigators' headerRight. */
export function TopBar({ menuOpen, onToggleMenu }: { menuOpen: boolean; onToggleMenu: () => void }) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-badge">🏫</span>
        <span>School Drop-off &amp; Pick-up</span>
      </div>
      <div className="topbar-actions">
        <LogoutButton />
        {/* Hidden above the ~860px breakpoint (same one PublicNavbar uses) — the sidebar shows as a persistent left column there instead. */}
        <button
          type="button"
          className="hamburger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
