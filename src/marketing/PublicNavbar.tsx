import { useState } from 'react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'Who it\'s for' },
];

/**
 * Public marketing navbar — shown on the home page (and reachable from
 * the login page) for logged-out visitors. The in-app TopBar (with the
 * Log Out button) takes over once someone's signed in.
 */
export function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="public-nav">
      <div className="public-nav-inner">
        <Link to="/" className="topbar-brand" onClick={() => setMenuOpen(false)}>
          <span className="topbar-badge">🏫</span>
          <span>School Drop-off &amp; Pick-up</span>
        </Link>

        <nav className="nav-links">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="nav-login-link">Log In</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>

        <button
          type="button"
          className="hamburger"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)}>Log In</Link>
          <Link to="/register" className="btn btn-primary btn-block" onClick={() => setMenuOpen(false)}>
            Get Started
          </Link>
        </div>
      )}
    </header>
  );
}
