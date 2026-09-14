import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { SummaryTile } from '../../components/SummaryTile';
import { useAuth } from '../../context/AuthContext';
import { api, type AdminOverview } from '../../services/api';
import type { Notice } from '../../types';

const POLL_MS = 4000;

/**
 * Schoolwide metrics dashboard. Ported from mobile_app's OverviewScreen.
 * Every tile — including pending requests, now that the queue is a
 * real backend table — comes from the backend, scoped to the
 * signed-in admin's own school. Polls rather than pushing, since
 * there's no websocket/live-update transport yet.
 *
 * Also surfaces admin-targeted notices here rather than as a separate
 * nav item — right now that's just "a parent added a co-guardian",
 * but this is where anything else that should catch an admin's eye
 * without requiring approval belongs.
 */
export function OverviewScreen() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => {
      api.adminOverview(token).then(next => { if (!cancelled) setOverview(next); }).catch(() => {});
      api.adminNotices(token).then(next => { if (!cancelled) setNotices(next); }).catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const markRead = (noticeId: string) => {
    setNotices(prev => prev.map(n => (n.id === noticeId ? { ...n, read: true } : n)));
    if (token) api.markNoticeRead(token, noticeId).catch(() => {});
  };

  return (
    <Screen title="Overview" subtitle="School-wide snapshot.">
      <div className="tile-grid">
        <SummaryTile label="Total Enrolled Students" value={overview?.totalStudents ?? 0} />
        <SummaryTile label="Active Teachers" value={overview?.activeTeachers ?? 0} />
        <SummaryTile label="Present Today" value={overview?.presentToday ?? 0} accentColor="#16A34A" />
        <SummaryTile label="Pending Requests" value={overview?.pendingRequests ?? 0} accentColor="#F59E0B" />
      </div>

      {notices.length > 0 && (
        <>
          <p className="card-title" style={{ margin: '4px 0' }}>Notifications</p>
          {notices.map(notice => (
            <button
              key={notice.id}
              type="button"
              className={`card${!notice.read ? ' card-unread' : ''}`}
              style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
              onClick={() => markRead(notice.id)}
            >
              <div className="card-row" style={{ justifyContent: 'flex-start' }}>
                <span className="quick-action-title" style={{ flexShrink: 1 }}>{notice.title}</span>
                {!notice.read && <span className="dot" />}
              </div>
              <p style={{ fontSize: 14, color: 'var(--text)', margin: '6px 0 0' }}>{notice.body}</p>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: '10px 0 0' }}>
                {new Date(notice.createdAt).toLocaleString()}
              </p>
            </button>
          ))}
        </>
      )}
    </Screen>
  );
}
