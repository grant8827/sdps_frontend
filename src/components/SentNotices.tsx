import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { SentNotice } from '../types';

/** The Sent tab of every Messages screen (admin, teacher, parent): what the signed-in user sent, and to whom. Loads on mount, so opening the tab right after sending shows the new message. */
export function SentNotices() {
  const { token } = useAuth();
  const [sent, setSent] = useState<SentNotice[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.sentNotices(token)
      .then(next => { if (!cancelled) setSent(next); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load sent messages'); });
    return () => { cancelled = true; };
  }, [token]);

  if (error) return <div className="card">{error}</div>;
  if (!sent) return <p className="empty-text">Loading…</p>;
  if (sent.length === 0) return <p className="empty-text">You haven't sent any messages yet.</p>;

  return (
    <>
      {sent.map(notice => (
        <div key={notice.id} className="card">
          <span className="quick-action-title">{notice.title}</span>
          <p style={{ fontSize: 14, color: 'var(--text)', margin: '6px 0 0' }}>{notice.body}</p>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '10px 0 0' }}>
            To: {notice.recipient} · {new Date(notice.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </>
  );
}
