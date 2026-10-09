import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Screen } from '../../components/Screen';
import { ReasonDialog } from '../../components/ReasonDialog';
import { useAuth } from '../../context/AuthContext';
import { api, type DataRequest, type DataRequestEvent, type DataRequestStatus } from '../../services/api';
import { ROLE_LABELS, actionLabel } from '../../utils/auditLabels';
import { formatUtcTimestamp } from '../../utils/utcTime';
import { DataRequestStatusBadge, KIND_LABEL, STATUS_LABEL, SUBJECT_LABEL } from './dataRequestLabels';

const STEPS: DataRequestStatus[] = ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED'];

/**
 * One data request: what was asked, its progress, the next step, and its
 * full history from the audit log. Exports are downloaded here once
 * approved; an approved student deletion is run here by typing the
 * student's name.
 */
export function DataRequestDetailScreen() {
  const { requestId = '' } = useParams();
  const { token, user, can } = useAuth();
  const [request, setRequest] = useState<(DataRequest & { history: DataRequestEvent[] }) | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dialog, setDialog] = useState<{ to: DataRequestStatus; title: string; danger?: boolean } | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try { setRequest(await api.dataRequest(token, requestId)); } catch (err) { setError(err instanceof Error ? err.message : 'Could not load'); }
  }, [token, requestId]);
  useEffect(() => { load(); }, [load]);

  if (!request) return <Screen title="Data request">{error ? <div className="card" role="alert">{error}</div> : <p className="empty-text">Loading…</p>}</Screen>;

  const manage = can('data_request:manage');
  const move = async (to: DataRequestStatus, note?: string) => {
    if (!token) return;
    await api.setDataRequestStatus(token, request.id, to, note);
    setDialog(null);
    setMessage(`Moved to ${STATUS_LABEL[to].toLowerCase()}.`);
    await load();
  };
  const tryMove = async (to: DataRequestStatus) => {
    try { await move(to); } catch (err) { setMessage(err instanceof Error ? err.message : 'Could not update'); }
  };
  const download = async () => {
    if (!token) return;
    try { await api.downloadDataRequestExport(token, request.id); setMessage('Export downloaded. Send it securely, then mark the request completed with how it was sent.'); await load(); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Could not download'); }
  };
  const runDeletion = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setRunning(true);
    try { await api.runDataRequestDeletion(token, request.id, confirmName); setMessage('The student\'s records were permanently deleted.'); setConfirmName(''); await load(); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Could not delete'); }
    finally { setRunning(false); }
  };

  const loggedByMe = request.createdById === user?.id;
  const automatedDeletion = request.kind === 'DELETION' && request.subjectType === 'STUDENT';
  const automatedExport = request.kind === 'EXPORT' && request.subjectType !== 'PARENT';
  const stepIndex = STEPS.indexOf(request.status);

  return (
    <Screen title={`${KIND_LABEL[request.kind]} request`} subtitle={`${SUBJECT_LABEL[request.subjectType]}: ${request.subjectLabel} · ${request.schoolName}`}>
      <p style={{ margin: 0 }}><Link to="/platform/compliance/requests">← All data requests</Link></p>
      {message && <div className="card" role="status">{message}</div>}
      {request.legalHold && <div className="card" role="alert"><strong>{request.schoolName} is on legal hold:</strong> {request.legalHold}. Nothing there can be deleted until it's released.</div>}

      {request.status === 'REJECTED'
        ? <div className="card"><DataRequestStatusBadge status="REJECTED" /> {request.statusNote}</div>
        : (
          <ol className="request-steps" aria-label="Progress">
            {STEPS.map((step, i) => (
              <li key={step} className={i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''} aria-current={i === stepIndex ? 'step' : undefined}>{STATUS_LABEL[step]}</li>
            ))}
          </ol>
        )}

      <div className="card" style={{ display: 'grid', gap: 6, fontSize: 14 }}>
        <div><strong>Requested by:</strong> {request.requesterName}{request.requesterRelationship && ` (${request.requesterRelationship})`}{request.receivedVia && ` · ${request.receivedVia}`}</div>
        <div><strong>Logged:</strong> {formatUtcTimestamp(request.createdAt)} by {request.createdBy}</div>
        {!['COMPLETED', 'REJECTED'].includes(request.status) && <div><strong>Due:</strong> {formatUtcTimestamp(request.dueAt).split(',')[0]}{request.overdue && <strong style={{ color: 'var(--red)' }}> (overdue)</strong>}</div>}
        {request.approvedBy && <div><strong>Approved by:</strong> {request.approvedBy}</div>}
        {request.details && <div><strong>Details:</strong> {request.details}</div>}
        {request.outcome?.erased && (
          <div>
            <strong>Deleted:</strong> {Object.entries(request.outcome.erased).map(([k, v]) => `${v} ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}`).join(', ')}.
            {request.outcome.kept && <> <strong>Kept:</strong> {request.outcome.kept.join('; ')}.</>}
          </div>
        )}
      </div>

      {manage && (
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="form-title" style={{ margin: 0 }}>Next step</h2>
          {request.status === 'REQUESTED' && (
            <div className="action-row">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => tryMove('UNDER_REVIEW')}>Start review</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ to: 'REJECTED', title: 'Reject this request?' })}>Reject</button>
            </div>
          )}
          {request.status === 'UNDER_REVIEW' && (
            <>
              <p style={{ margin: 0, fontSize: 14 }}>Check that the person asking has the right to the records (for example, confirm with the school that they're the child's parent), and that nothing must be kept.</p>
              {request.kind === 'DELETION' && loggedByMe && <p className="field-label" style={{ margin: 0 }}>You logged this deletion, so another administrator must approve it.</p>}
              <div className="action-row">
                <button type="button" className="btn btn-primary btn-sm" disabled={request.kind === 'DELETION' && (loggedByMe || Boolean(request.legalHold))} onClick={() => setDialog({ to: 'APPROVED', title: `Approve this ${request.kind === 'DELETION' ? 'deletion' : 'export'}?` })}>Approve</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDialog({ to: 'REJECTED', title: 'Reject this request?' })}>Reject</button>
              </div>
            </>
          )}
          {request.status === 'APPROVED' && request.kind === 'EXPORT' && (
            automatedExport
              ? <div><button type="button" className="btn btn-primary btn-sm" onClick={download}>Download the export</button></div>
              : <div className="action-row"><span style={{ fontSize: 14 }}>Prepare this parent's records by hand, then:</span><button type="button" className="btn btn-primary btn-sm" onClick={() => tryMove('PROCESSING')}>Mark as being prepared</button></div>
          )}
          {request.status === 'APPROVED' && request.kind === 'DELETION' && (
            automatedDeletion ? (
              <form className="action-row" onSubmit={runDeletion}>
                <span style={{ fontSize: 14 }}>This permanently deletes the student's records, attendance, pickup history and guardian links. The audit log keeps the record that it happened. Type the student's full name to confirm:</span>
                <input className="input" style={{ maxWidth: 260 }} aria-label="Student's full name" value={confirmName} onChange={e => setConfirmName(e.target.value)} />
                <button type="submit" className="btn btn-danger btn-sm" disabled={running || !confirmName.trim() || Boolean(request.legalHold)}>{running ? 'Deleting…' : 'Run deletion'}</button>
              </form>
            ) : <div className="action-row"><span style={{ fontSize: 14 }}>Carry out this deletion by hand with the school, then:</span><button type="button" className="btn btn-primary btn-sm" onClick={() => tryMove('PROCESSING')}>Mark as in progress</button></div>
          )}
          {request.status === 'PROCESSING' && (
            <div className="action-row">
              {automatedExport && <button type="button" className="btn btn-secondary btn-sm" onClick={download}>Download again</button>}
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setDialog({ to: 'COMPLETED', title: 'Mark this request completed?' })}>Mark completed</button>
            </div>
          )}
          {['COMPLETED', 'REJECTED'].includes(request.status) && <p style={{ margin: 0, fontSize: 14 }}>This request is closed.</p>}
        </section>
      )}

      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="form-title" style={{ margin: 0 }}>History</h2>
        <ol className="history-list">
          {request.history.map(event => (
            <li key={event.id}>
              <span className="field-label" style={{ margin: 0 }}>{formatUtcTimestamp(event.createdAt)}</span>{' '}
              <strong>{actionLabel(event.action)}</strong> by {event.actorName ?? 'unknown'}{event.actorRole && ` (${ROLE_LABELS[event.actorRole] ?? event.actorRole})`}
              {event.reason && <div style={{ fontSize: 14 }}>"{event.reason}"</div>}
            </li>
          ))}
        </ol>
      </section>

      {dialog && (
        <ReasonDialog
          title={dialog.title}
          message={dialog.to === 'COMPLETED' ? 'Note how it was completed (for example, how and to whom the export was sent).' : dialog.to === 'APPROVED' ? 'Note what you checked before approving.' : 'Note why, for the record.'}
          fieldLabel="Note (kept in the audit log)"
          confirmLabel={STATUS_LABEL[dialog.to] === 'Approved' ? 'Approve' : dialog.to === 'REJECTED' ? 'Reject' : 'Mark completed'}
          danger={dialog.to === 'REJECTED'}
          onConfirm={note => move(dialog.to, note)}
          onClose={() => setDialog(null)}
        />
      )}
    </Screen>
  );
}
