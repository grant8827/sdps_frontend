import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';

/**
 * Shared shell for both auth pages (Login and Register a school): a
 * brand line linking home, the form (passed as children), centered, and
 * the site footer below.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <main className="auth-form-side">
        <div className="auth-form-inner">
          <Link to="/" className="auth-brand-line" aria-label="Back to home">
            <span className="topbar-badge">🏫</span>
            <span>School Drop-off &amp; Pick-up</span>
          </Link>
          {children}
        </div>
        <SiteFooter compact />
      </main>
    </div>
  );
}
