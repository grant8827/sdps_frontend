import type { ReactNode } from 'react';
import { PublicNavbar } from '../marketing/PublicNavbar';
import { SiteFooter } from './SiteFooter';

/**
 * Shared shell for both auth pages (Login and Register a school): the
 * same public header and footer as the home page, with the form
 * (passed as children) centered between them.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-page auth-page">
      <PublicNavbar />
      <main className="auth-form-side">
        <div className="auth-form-inner">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
