import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogoutButton } from './LogoutButton';
import { BrandLogo } from '../components/BrandLogo';

/** Persistent app bar shown above every role's tabs, mirroring the RN navigators' headerRight. */
export function TopBar({ menuOpen, onToggleMenu }: { menuOpen: boolean; onToggleMenu: () => void }) {
  const { user, schools, activeSchoolId, setActiveSchool, supportSession } = useAuth();
  const securityPath = user?.platform && !supportSession ? '/platform/security' : `/${user?.role}/security`;
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <BrandLogo height={38} />
      </div>
      <div className="topbar-actions">
        {schools.length > 1 && (
          <select
            className="input"
            aria-label="School"
            value={activeSchoolId ?? ''}
            onChange={e => setActiveSchool(e.target.value)}
            style={{ width: 'auto', maxWidth: 220, padding: '6px 10px', fontSize: 14 }}
          >
            {schools.map(school => <option key={school.schoolId} value={school.schoolId}>{school.schoolName}</option>)}
          </select>
        )}
        {user?.platform && supportSession && <Link to="/platform" className="logout-btn" style={{ textDecoration: 'none' }}>Platform</Link>}
        {user && <Link to={securityPath} className="logout-btn" style={{ textDecoration: 'none' }}>Security</Link>}
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
