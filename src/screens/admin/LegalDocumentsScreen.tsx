import { Link, Navigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { LEGAL_DOCUMENTS } from '../../legal/documents';
import { Markdown } from '../../legal/Markdown';

const GROUPS = [
  { group: 'legal', title: 'Agreements and privacy' },
  { group: 'trust', title: 'Security and data handling' },
] as const;

/**
 * Admin → Legal & Policies: every SDPMPlus legal and policy document the
 * school agrees to or may be asked for (privacy, terms, the data
 * processing agreement, security, retention, incident response,
 * subprocessors), readable inside the dashboard. /admin/legal lists
 * them; /admin/legal/<slug> shows one.
 */
export function LegalDocumentsScreen() {
  const { slug } = useParams();
  if (slug) {
    const doc = LEGAL_DOCUMENTS.find(d => d.slug === slug);
    if (!doc) return <Navigate to="/admin/legal" replace />;
    return (
      <Screen title={doc.title} subtitle="Legal & Policies">
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <Link to="/admin/legal" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>← All documents</Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>Print or save as PDF</button>
        </div>
        <article className="card legal-article" style={{ margin: 0, maxWidth: 'none' }}>
          <Markdown source={doc.source} />
        </article>
      </Screen>
    );
  }
  return (
    <Screen title="Legal & Policies" subtitle="The agreements and policies that cover your school's use of SDPMPlus.">
      {GROUPS.map(({ group, title }) => (
        <div key={group} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="form-title" style={{ margin: 0 }}>{title}</p>
          {LEGAL_DOCUMENTS.filter(doc => doc.group === group).map(doc => (
            <Link key={doc.slug} to={`/admin/legal/${doc.slug}`} style={{ fontSize: 15 }}>{doc.title}</Link>
          ))}
        </div>
      ))}
    </Screen>
  );
}
