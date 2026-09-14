import { NavLink } from 'react-router-dom';

export interface TabDef {
  to: string;
  label: string;
  end?: boolean;
  badge?: number;
}

/** Left nav for each web dashboard — replaces the mobile bottom tab bar on the website. */
export function Sidebar({ tabs }: { tabs: TabDef[] }) {
  return (
    <nav className="sidebar">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
        >
          <span>{tab.label}</span>
          {!!tab.badge && <span className="sidebar-badge">{tab.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
