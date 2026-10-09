import { useEffect, useRef, useState } from 'react';

const REFRESH_MS = 10_000;

/**
 * Re-runs `load` every 10 seconds while `live` is on and the tab is
 * visible (a hidden tab doesn't keep polling every school's queue).
 * Returns when it last succeeded.
 */
export function usePolling(load: () => Promise<void>, live: boolean) {
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    let cancelled = false;
    const run = () => loadRef.current().then(() => { if (!cancelled) setUpdatedAt(new Date()); }).catch(() => {});
    run();
    if (!live) return () => { cancelled = true; };
    const timer = setInterval(() => { if (document.visibilityState === 'visible') run(); }, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [live, load]);
  return updatedAt;
}

/** "● Live · updated 2:31:05 PM  [Pause]" — moving content must be pausable. */
export function LiveControl({ live, onToggle, updatedAt }: { live: boolean; onToggle: () => void; updatedAt: Date | null }) {
  return (
    <div className="action-row" aria-live="off">
      <span className="field-label" style={{ margin: 0 }}>
        <span className={`live-dot${live ? '' : ' paused'}`} aria-hidden />
        {live ? 'Live, refreshing every 10 seconds' : 'Paused'}
        {updatedAt && ` · updated ${updatedAt.toLocaleTimeString()}`}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onToggle} aria-pressed={!live}>{live ? 'Pause' : 'Resume'}</button>
    </div>
  );
}

export function WaitBadge({ minutes, warn, alert }: { minutes: number | null; warn: number; alert: number }) {
  if (minutes === null) return <span className="field-label">—</span>;
  const text = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return <span className={`wait-badge${minutes >= alert ? ' alert' : minutes >= warn ? ' warn' : ''}`}>{text}</span>;
}

export const REQUEST_TYPE_LABEL = { DROP_OFF: 'Drop-off', PICK_UP: 'Pickup' } as const;
