import { Link } from 'react-router-dom';
import { COMPANY_NAME, LEGAL_DOCUMENTS } from '../legal/documents';

/** Site-wide footer: brand, copyright and links to every legal/policy page. Shown on public pages and inside the dashboards. */
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`site-footer${compact ? ' site-footer-compact' : ''}`}>
      <div className="footer-inner">
        {!compact && (
          <div className="topbar-brand">
            <span className="topbar-badge">🏫</span>
            <span>School Drop-off &amp; Pick-up</span>
          </div>
        )}
        <nav className="footer-links" aria-label="Legal and policies">
          {LEGAL_DOCUMENTS.map(doc => <Link key={doc.slug} to={`/legal/${doc.slug}`}>{doc.title}</Link>)}
        </nav>
        <p className="footer-copy">© {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
      </div>
    </footer>
  );
}
