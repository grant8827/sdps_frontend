import { useState } from 'react';
import type { QueueItem } from '../types';

export interface QueueVerification { code?: string; overrideReason?: string }

/**
 * Shared card list for a live queue (already filtered to one request type
 * by the caller's tab). A pickup that requiresCode can only be confirmed
 * by typing the 6-digit code shown on the requesting parent's phone;
 * when `allowOverride` is set (admins), it can instead be released with
 * a written reason, e.g. after checking ID because the phone died.
 * onApprove/onDecline reject with the server's message, shown on the card.
 */
export function QueueList({ items, onApprove, onDecline, allowOverride = false }: {
  items: QueueItem[];
  onApprove: (item: QueueItem, verification: QueueVerification) => Promise<void>;
  onDecline: (item: QueueItem) => Promise<void>;
  allowOverride?: boolean;
}) {
  const [codes, setCodes] = useState<Record<string, string>>({});
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
  const override = (item: QueueItem) => {
    const reason = window.prompt(`Release ${item.childName} without the pickup code? Say how you verified the adult (e.g. "Checked driver's license"):`, '');
    if (reason?.trim()) run(item, () => onApprove(item, { overrideReason: reason.trim() }));
  };

  return (
    <>
      {items.map(item => {
        const code = codes[item.id] ?? '';
        const needsCode = Boolean(item.requiresCode);
        return (
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

            {needsCode && (
              <>
                <p className="field-label" style={{ margin: '0 0 4px' }}>Ask {item.parentName} for the pickup code on their phone</p>
                <input
                  className="input"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="6-digit pickup code"
                  maxLength={7}
                  value={code}
                  onChange={e => setCodes(current => ({ ...current, [item.id]: e.target.value.replace(/[^\d]/g, '').slice(0, 6) }))}
                  style={{ marginBottom: 10, fontSize: 20, letterSpacing: 4, textAlign: 'center' }}
                />
              </>
            )}
            {errors[item.id] && <p style={{ color: 'var(--red)', fontSize: 13, margin: '0 0 10px' }}>{errors[item.id]}</p>}

            <div className="card-row" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={busy === item.id || (needsCode && code.length !== 6)}
                onClick={() => run(item, () => onApprove(item, needsCode ? { code } : {}))}
              >
                Confirm
              </button>
              <button type="button" className="btn btn-danger btn-block" disabled={busy === item.id} onClick={() => run(item, () => onDecline(item))}>
                Decline
              </button>
            </div>
            {needsCode && allowOverride && (
              <button type="button" className="link-danger" style={{ marginTop: 8 }} onClick={() => override(item)}>
                Parent can't show the code? Release with ID check…
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
