import { NavLink } from 'react-router-dom';

export interface TabDef {
  to: string;
  label: string;
  end?: boolean;
  badge?: number;
}

/**
 * Left nav for each web dashboard — replaces the mobile bottom tab bar
 * on the website. Below the ~860px breakpoint it becomes a dropdown
 * panel toggled by TopBar's hamburger button instead of a persistent
 * column (see the `.sidebar`/`.sidebar-open` rules in index.css) —
 * `open` and `onNavigate` only matter there; above it the sidebar is
 * always visible regardless of `open`.
 */
export function Sidebar({ tabs, open = true, onNavigate }: { tabs: TabDef[]; open?: boolean; onNavigate?: () => void }) {
  return (
    <nav className={`sidebar${open ? ' sidebar-open' : ''}`}>
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
          onClick={onNavigate}
        >
          <span>{tab.label}</span>
          {!!tab.badge && <span className="sidebar-badge">{tab.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
