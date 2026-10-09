import { useState } from 'react';
import type { QueueItem } from '../types';

/**
 * Shared card list for a live queue (already filtered to one request type
 * by the caller's tab): who is asking, for which child, and Confirm /
 * Decline. onApprove/onDecline reject with the server's message, which is
 * shown on the card.
 */
export function QueueList({ items, onApprove, onDecline }: {
  items: QueueItem[];
  onApprove: (item: QueueItem) => Promise<void>;
  onDecline: (item: QueueItem) => Promise<void>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) return <p className="empty-text">No pending requests.</p>;

  const run = async (item: QueueItem, action: () => Promise<void>) => {
    setBusy(item.id);
    setErrors(current => ({ ...current, [item.id]: '' }));
    try { await action(); }
    catch (error) { setErrors(current => ({ ...current, [item.id]: error instanceof Error ? error.message : 'Something went wrong' })); }
    finally { setBusy(null); }
  };

  return (
    <>
      {items.map(item => (
        <div key={item.id} className="card">
          <div className="card-row" style={{ marginBottom: 4 }}>
            {item.childPhotoUrl ? (
              <img src={item.childPhotoUrl} alt="" className="avatar" />
            ) : (
              <span className="avatar avatar-placeholder">{item.childName.charAt(0)}</span>
            )}
            <div style={{ flex: 1, marginLeft: 10 }}>
              <span className="quick-action-title" style={{ fontSize: 17, fontWeight: 700, display: 'block' }}>
                {item.childName}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.className || 'Unassigned'}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {item.requestType === 'DROP_OFF' ? 'Drop-off' : 'Pick-up'}
            </span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text)', margin: '4px 0 0' }}>
            Parent: {item.parentName}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 12px' }}>
            {new Date(item.requestedAt).toLocaleTimeString()}
          </p>

          {errors[item.id] && <p style={{ color: 'var(--red)', fontSize: 13, margin: '0 0 10px' }}>{errors[item.id]}</p>}

          <div className="card-row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary btn-block" disabled={busy === item.id} onClick={() => run(item, () => onApprove(item))}>
              Confirm
            </button>
            <button type="button" className="btn btn-danger btn-block" disabled={busy === item.id} onClick={() => run(item, () => onDecline(item))}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
