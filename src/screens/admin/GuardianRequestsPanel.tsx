import { useState } from 'react';
import { GuardianRequestStatusPill } from '../../components/GuardianRequestStatusPill';
import { useAuth } from '../../context/AuthContext';
import { api, type GuardianRequest } from '../../services/api';
import { formatUtcTimestamp } from '../../utils/utcTime';

/**
 * Families → Pending Approvals: adults a parent asked to have authorized
 * for their children. Approving creates the real guardian link (pickup
 * rights, plus — if ticked — permission to request further adults);
 * rejecting leaves them with no access. Either way the parent gets a
 * message, and the decision is kept below as history.
 */
export function GuardianRequestsPanel({ requests, onChanged }: { requests: GuardianRequest[]; onChanged: () => Promise<void> }) {
  const { token } = useAuth();
  const [canManage, setCanManage] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const pending = requests.filter(r => r.status === 'PENDING');
  const decided = requests.filter(r => r.status !== 'PENDING');

  const decide = async (request: GuardianRequest, approve: boolean) => {
    if (!token) return;
    let note: string | undefined;
    if (!approve) {
      const answer = window.prompt(`Reject ${request.fullName}? Optionally add a note for ${request.requestedByName}:`, '');
      if (answer === null) return;
      note = answer.trim() || undefined;
    }
    setBusy(request.batchId);
    setMessage('');
    try {
      if (approve) await api.approveGuardianRequest(token, request.batchId, Boolean(canManage[request.batchId]));
      else await api.rejectGuardianRequest(token, request.batchId, note);
      setMessage(`${request.fullName} ${approve ? 'approved' : 'rejected'}. ${request.requestedByName} has been notified.`);
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the decision');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {message && <div className="card">{message}</div>}
      {pending.length === 0 && <p className="empty-text">No adults are waiting for approval.</p>}
      {pending.map(request => (
        <div key={request.batchId} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="card-row" style={{ gap: 8 }}>
            <p className="quick-action-title" style={{ margin: 0, fontSize: 16 }}>{request.fullName}</p>
            <GuardianRequestStatusPill status={request.status} />
          </div>
          <p style={{ margin: 0, fontSize: 14 }}><strong>Relationship:</strong> {request.relationship}</p>
          <p style={{ margin: 0, fontSize: 14 }}><strong>For:</strong> {request.students.join(', ')}</p>
          <p style={{ margin: 0, fontSize: 14 }}><strong>Contact:</strong> {[request.email, request.phone].filter(Boolean).join(' · ')}</p>
          <p className="field-label" style={{ margin: 0 }}>Asked by {request.requestedByName} on {formatUtcTimestamp(request.requestedAt)}</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={Boolean(canManage[request.batchId])}
              onChange={e => setCanManage(current => ({ ...current, [request.batchId]: e.target.checked }))}
            />
            Also allow them to ask for other adults to be added
          </label>
          <div className="btn-row">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy === request.batchId} onClick={() => decide(request, true)}>Approve</button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busy === request.batchId} onClick={() => decide(request, false)}>Reject</button>
          </div>
        </div>
      ))}

      {decided.length > 0 && (
        <>
          <p className="form-title" style={{ marginBottom: 0 }}>History</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Adult</th><th>For</th><th>Asked by</th><th>Decision</th><th>Decided by</th></tr>
              </thead>
              <tbody>
                {decided.map(request => (
                  <tr key={request.batchId}>
                    <td>{request.fullName}<div className="field-label" style={{ margin: 0 }}>{request.relationship}</div></td>
                    <td>{request.students.join(', ')}</td>
                    <td>{request.requestedByName}<div className="field-label" style={{ margin: 0 }}>{formatUtcTimestamp(request.requestedAt)}</div></td>
                    <td>
                      <GuardianRequestStatusPill status={request.status} />
                      {request.decisionNote && <div className="field-label" style={{ margin: '4px 0 0' }}>{request.decisionNote}</div>}
                    </td>
                    <td>{request.decidedByName ?? '—'}{request.decidedAt && <div className="field-label" style={{ margin: 0 }}>{formatUtcTimestamp(request.decidedAt)}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
