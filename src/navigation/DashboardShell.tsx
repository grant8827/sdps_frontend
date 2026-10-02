import { useState, type ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Sidebar, type TabDef } from './Sidebar';

/**
 * Shared shell for every role's web dashboard (Admin/Parent/Teacher):
 * topbar + sidebar nav + content. Owns the open/closed state for the
 * sidebar's mobile form (a hamburger-toggled dropdown below ~860px,
 * same pattern as the logged-out marketing pages' PublicNavbar) so
 * each role's layout doesn't have to duplicate it.
 */
export function DashboardShell({ tabs, children }: { tabs: TabDef[]; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <TopBar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen(open => !open)} />
      <div className="app-body">
        <Sidebar tabs={tabs} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
