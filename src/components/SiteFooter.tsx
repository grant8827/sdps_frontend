import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COMPANY_NAME } from '../legal/documents';
import { BrandLogo } from './BrandLogo';

interface FooterLink { label: string; to: string }

// The app store pages. Paste each link in when the app is published;
// until then the name shows as plain text.
const APP_STORE_URL = '';
const GOOGLE_PLAY_URL = '';
const APPS = [
  { label: 'iPhone — App Store', url: APP_STORE_URL },
  { label: 'Android — Google Play', url: GOOGLE_PLAY_URL },
];

// The legal and policy documents aren't in the footer: schools read them
// under Legal & Policies in their dashboard (they stay at /legal/<slug>).
const FOR_SCHOOLS: FooterLink[] = [
  { label: 'Register your school', to: '/register' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Already a school? Sign in', to: '/login' },
];

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

function AppsColumn() {
  return (
    <div className="footer-column">
      <p className="footer-heading">Get the app</p>
      <ul>
        {APPS.map(app => (
          <li key={app.label}>
            {app.url
              ? <a href={app.url} target="_blank" rel="noopener noreferrer">{app.label}</a>
              : <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{app.label}</span>}
          </li>
        ))}
        <li><Link to="/delete-account">Delete your account</Link></li>
      </ul>
    </div>
  );
}

/**
 * Footer for the public pages (home, sign-in, register, legal pages) in
 * columns: brand, Product and For schools (or, when signed in, your
 * account), and Get the app, over a bottom bar with the copyright. Not
 * shown inside the dashboards.
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
        {!user && <FooterColumn title="For schools" links={FOR_SCHOOLS} />}
        <AppsColumn />
      </div>
      <div className="footer-bottom">
        <p className="footer-copy">© {year} sdpmplus.com | All rights reserved.</p>
        <p className="footer-copy">sdpmplus.com is a product of {COMPANY_NAME}.</p>
      </div>
    </footer>
  );
}
