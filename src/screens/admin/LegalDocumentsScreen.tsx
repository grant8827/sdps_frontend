import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { POLICIES_VERSION, POLICY_DOCUMENTS, SCHOOL_DOCUMENTS } from '../../legal/documents';
import { Markdown } from '../../legal/Markdown';
import { api } from '../../services/api';
import { usePolicyAcknowledgment } from '../../utils/policyAcknowledgment';

const when = (stamp: string) => new Date(`${stamp.replace(' ', 'T')}Z`).toLocaleString();

/**
 * Who confirmed reading these documents, or (for a school administrator)
 * the box to confirm it. Recorded for the platform with each document's
 * date; a document being updated asks again.
 */
function AcknowledgmentCard() {
  const { token, canManageSchool, supportSession, schools, activeSchoolId } = useAuth();
  const schoolName = (schools.find(s => s.schoolId === activeSchoolId) ?? schools[0])?.schoolName ?? 'my school';
  const { acknowledgment, current, setAcknowledgment } = usePolicyAcknowledgment();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (current === undefined) return null;
  if (current && acknowledgment) {
    return (
      <div className="card" role="status" style={{ borderLeft: '4px solid var(--green)', fontSize: 14 }}>
        Read and confirmed by <strong>{acknowledgment.userName}</strong> on {when(acknowledgment.acknowledgedAt)}.
      </div>
    );
  }
  const canConfirm = canManageSchool && !supportSession;
  const confirmRead = async () => {
    if (!token || !checked) return;
    setBusy(true);
    setError('');
    try {
      setAcknowledgment((await api.acknowledgePolicies(token, { version: POLICIES_VERSION, documents: POLICY_DOCUMENTS })).acknowledgment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your confirmation');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '4px solid var(--amber)' }}>
      <p className="form-title" style={{ margin: 0 }}>{acknowledgment ? 'Some documents were updated' : 'Please read and confirm'}</p>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
        {acknowledgment
          ? `${acknowledgment.userName} confirmed the earlier versions on ${when(acknowledgment.acknowledgedAt)}. Please read the documents below again and confirm.`
          : 'Read each document below, then confirm. The confirmation is recorded with the date of each document.'}
      </p>
      {canConfirm ? (
        <>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop: 3 }} />
            <span>I have read these policies on behalf of {schoolName}.</span>
          </label>
          <div><button type="button" className="btn btn-primary" disabled={!checked || busy} onClick={confirmRead}>{busy ? 'Saving…' : 'Confirm'}</button></div>
          {error && <p className="form-error" style={{ margin: 0 }}>{error}</p>}
        </>
      ) : <p className="field-label" style={{ margin: 0 }}>A school administrator needs to confirm this.</p>}
    </div>
  );
}

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
    const doc = SCHOOL_DOCUMENTS.find(d => d.slug === slug);
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
      <AcknowledgmentCard />
      {GROUPS.map(({ group, title }) => (
        <div key={group} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p className="form-title" style={{ margin: 0 }}>{title}</p>
          {SCHOOL_DOCUMENTS.filter(doc => doc.group === group).map(doc => (
            <Link key={doc.slug} to={`/admin/legal/${doc.slug}`} style={{ fontSize: 15 }}>{doc.title}</Link>
          ))}
        </div>
      ))}
    </Screen>
  );
}
