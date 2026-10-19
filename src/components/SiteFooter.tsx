import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COMPANY_NAME, LEGAL_DOCUMENTS } from '../legal/documents';
import { BrandLogo } from './BrandLogo';

interface FooterLink { label: string; to: string }

// Only a few policies are in the footer; schools find every document
// under Legal & Policies in their dashboard.
const legalLinks: FooterLink[] = LEGAL_DOCUMENTS.filter(doc => doc.footer).map(doc => ({ label: doc.title, to: `/legal/${doc.slug}` }));

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
 * Footer for the public pages (home, sign-in, register, legal pages) in
 * columns: brand, Product (or, when signed in, your account) and Legal,
 * over a bottom bar with the copyright. Not shown inside the dashboards.
 */
export function SiteFooter() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  const product: FooterLink[] = user
    ? [{ label: 'Dashboard', to: '/' }, { label: 'Security settings', to: `/${user.role}/security` }]
    : [
      { label: 'Features', to: '/#features' },
      { label: 'How it works', to: '/#how-it-works' },
      { label: 'Safety & privacy', to: '/#safety' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Register your school', to: '/register' },
    ];

  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link to="/" className="topbar-brand">
            <BrandLogo height={56} />
          </Link>
          <p className="footer-tagline">
            Faster, safer drop-offs and pick-ups for parents, teachers and school staff — on the web and on iPhone and Android.
          </p>
          <p className="footer-trust">🔒 Built for student privacy: no ads, no selling data.</p>
        </div>
        <FooterColumn title={user ? 'Your account' : 'Product'} links={product} />
        <FooterColumn title="Legal" links={legalLinks} />
      </div>
      <div className="footer-bottom">
        <p className="footer-copy">© {year} sdpmplus.com | All rights reserved.</p>
        <p className="footer-copy">sdpmplus.com is a product of {COMPANY_NAME}.</p>
      </div>
    </footer>
  );
}
