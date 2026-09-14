import { Screen } from '../../components/Screen';
import { useNotices } from '../../context/NoticesContext';

/** Parent Tab 3 - School Notices & Announcements. Ported from mobile_app's NoticesScreen. */
export function NoticesScreen() {
  const { notices, markRead } = useNotices();

  return (
    <Screen title="Notices" subtitle="Announcements from the school and your child's teacher.">
      {notices.length === 0 ? (
        <p className="empty-text">No notices yet.</p>
      ) : (
        notices
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map(notice => (
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
                {notice.senderName} ({notice.senderRole}) ·{' '}
                {new Date(notice.createdAt).toLocaleString()}
              </p>
            </button>
          ))
      )}
    </Screen>
  );
}
