import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { NoticeComposer, type NoticeTarget, type RecipientOption } from '../../components/NoticeComposer';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Notice } from '../../types';

type Tab = 'messages' | 'compose';

/** Teacher's Messages screen: an inbox (All Staff broadcasts, plus anything addressed to this teacher), and a composer to message the class or one parent. */
export function NoticesScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('messages');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [parents, setParents] = useState<RecipientOption[]>([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!token) return;
    const [nextNotices, nextParents] = await Promise.all([api.staffNotices(token), api.teacherParents(token)]);
    setNotices(nextNotices);
    setParents(nextParents.map(row => ({ id: row.id, label: row.fullName })));
  };
  useEffect(() => { load().catch(() => {}); }, [token]);

  const markRead = async (noticeId: string) => {
    if (!token) return;
    setNotices(prev => prev.map(n => (n.id === noticeId ? { ...n, read: true } : n)));
    api.markNoticeRead(token, noticeId).catch(() => {});
  };

  const handleSend = async (target: NoticeTarget, title: string, body: string) => {
    if (!token) return;
    setMessage('');
    try {
      await api.sendNotice(token, {
        title,
        body,
        targetType: target.type === 'ALL' ? 'CLASS' : 'PARENT',
        targetParentUserId: target.type === 'SINGLE' ? target.recipientId : undefined,
      });
      setMessage('Message sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send message');
    }
  };

  const handleSendToAdmin = async (_target: NoticeTarget, title: string, body: string) => {
    if (!token) return;
    setMessage('');
    try {
      await api.sendNotice(token, { title, body, targetType: 'ADMIN' });
      setMessage('Message sent to the school office.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send message');
    }
  };

  return (
    <Screen title="Messages" subtitle="School announcements, and messages to your class or a parent.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'messages' ? ' subtab-active' : ''}`} onClick={() => setTab('messages')}>Messages</button>
        <button type="button" className={`subtab${tab === 'compose' ? ' subtab-active' : ''}`} onClick={() => setTab('compose')}>Compose</button>
      </div>
      {message && <div className="card">{message}</div>}

      {tab === 'compose' && (
        <>
          <NoticeComposer
            allLabel="All Class Parents"
            singleLabel="One Parent"
            singleOptions={parents}
            onSend={handleSend}
          />
          <p className="field-label" style={{ margin: 0 }}>Or message the school office directly</p>
          <NoticeComposer
            allLabel="School Office"
            sendLabel="Send to School Office"
            onSend={handleSendToAdmin}
          />
        </>
      )}

      {tab === 'messages' && (
        notices.length === 0 ? (
          <p className="empty-text">No messages yet.</p>
        ) : (
          notices.map(notice => (
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
                {notice.senderName} ({notice.senderRole}) · {new Date(notice.createdAt).toLocaleString()}
              </p>
            </button>
          ))
        )
      )}
    </Screen>
  );
}
