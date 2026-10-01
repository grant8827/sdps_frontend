import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter';
import { useAuth } from '../context/AuthContext';
import { PublicNavbar } from '../marketing/PublicNavbar';
import { LEGAL_DOCUMENTS } from './documents';
import { Markdown } from './Markdown';

/** /legal/:slug — one policy document, readable whether or not you're signed in. */
export function LegalPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const doc = LEGAL_DOCUMENTS.find(d => d.slug === slug);

  useEffect(() => {
    if (doc) document.title = `${doc.title} · School Drop-off & Pick-up`;
    window.scrollTo(0, 0);
  }, [doc]);

  if (!doc) return <Navigate to="/legal/privacy-policy" replace />;

  return (
    <div className="public-page">
      {user ? (
        <header className="public-nav">
          <div className="public-nav-inner">
            <Link to="/" className="topbar-brand"><span className="topbar-badge">🏫</span><span>School Drop-off &amp; Pick-up</span></Link>
            <Link to="/" className="nav-login-link">← Back to your dashboard</Link>
          </div>
        </header>
      ) : <PublicNavbar />}
      <main className="legal-page">
        <article className="legal-article">
          <Markdown source={doc.source} />
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
