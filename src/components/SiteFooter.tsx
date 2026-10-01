import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COMPANY_NAME, LEGAL_DOCUMENTS } from '../legal/documents';

interface FooterLink { label: string; to: string }

const legalLinks = (group: 'legal' | 'trust'): FooterLink[] =>
  LEGAL_DOCUMENTS.filter(doc => doc.group === group).map(doc => ({ label: doc.title, to: `/legal/${doc.slug}` }));

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="footer-column">
      <p className="footer-heading">{title}</p>
      <ul>
        {links.map(link => (
          <li key={link.to}>
            {/* Section anchors on the home page are plain hrefs so the browser scrolls to them. */}
            {link.to.startsWith('/#') ? <a href={link.to}>{link.label}</a> : <Link to={link.to}>{link.label}</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Site-wide footer in columns: brand, Product (or, when signed in, your
 * account), Legal, and Trust & Security, over a bottom bar with the
 * copyright. `compact` (inside the dashboards and on the sign-in pages)
 * drops the brand blurb and uses tighter spacing.
 */
export function SiteFooter({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  const product: FooterLink[] = user
    ? [{ label: 'Dashboard', to: '/' }, { label: 'Security settings', to: `/${user.role}/security` }]
    : [
      { label: 'Features', to: '/#features' },
      { label: 'How it works', to: '/#how-it-works' },
      { label: "Who it's for", to: '/#roles' },
      { label: 'Log in', to: '/login' },
      { label: 'Register your school', to: '/register' },
    ];

  return (
    <footer className={`site-footer${compact ? ' site-footer-compact' : ''}`}>
      <div className="footer-main">
        {!compact && (
          <div className="footer-brand">
            <Link to="/" className="topbar-brand">
              <span className="topbar-badge">🏫</span>
              <span>School Drop-off &amp; Pick-up</span>
            </Link>
            <p className="footer-tagline">
              Faster, safer drop-offs and pick-ups for parents, teachers and school staff — on the web and on iPhone and Android.
            </p>
            <p className="footer-trust">🔒 Built for student privacy: no ads, no selling data.</p>
          </div>
        )}
        <FooterColumn title={user ? 'Your account' : 'Product'} links={product} />
        <FooterColumn title="Legal" links={legalLinks('legal')} />
        <FooterColumn title="Trust & Security" links={legalLinks('trust')} />
      </div>
      <div className="footer-bottom">
        <p className="footer-copy">© {year} {COMPANY_NAME}. All rights reserved.</p>
        <p className="footer-copy">School Drop-off &amp; Pick-up is a product of {COMPANY_NAME}.</p>
      </div>
    </footer>
  );
}
