import type { QueueItem } from '../types';

/** Shared card list for a live queue (already filtered to one request type by the caller's tab). */
export function QueueList({ items, onApprove, onDecline }: { items: QueueItem[]; onApprove: (item: QueueItem) => void; onDecline: (item: QueueItem) => void }) {
  if (items.length === 0) return <p className="empty-text">No pending requests.</p>;

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

          <div className="card-row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary btn-block" onClick={() => onApprove(item)}>
              Confirm
            </button>
            <button type="button" className="btn btn-danger btn-block" onClick={() => onDecline(item)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
