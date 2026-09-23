import { useEffect, useMemo, useState } from 'react';
import { Screen } from '../../components/Screen';
import { NoticeComposer, type NoticeTarget } from '../../components/NoticeComposer';
import { useAuth } from '../../context/AuthContext';
import { useNotices } from '../../context/NoticesContext';
import { api } from '../../services/api';

type Tab = 'messages' | 'compose';
type ComposeTarget = 'teacher' | 'admin';

/** Parent Tab 3 - Messages: announcements from school/teachers, and a way to message a specific teacher or the school office. */
export function NoticesScreen() {
  const { token } = useAuth();
  const { notices, markRead } = useNotices();
  const [tab, setTab] = useState<Tab>('messages');
  const [composeTarget, setComposeTarget] = useState<ComposeTarget>('teacher');
  const [teachers, setTeachers] = useState<{ id: string; label: string }[]>([]);
  const [teacherId, setTeacherId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api.myStudents(token)
      .then(children => {
        const byId = new Map<string, string>();
        for (const child of children) if (child.teacherId) byId.set(child.teacherId, child.teacherName || 'Teacher');
        setTeachers(Array.from(byId, ([id, label]) => ({ id, label })));
      })
      .catch(() => {});
  }, [token]);

  // teachers usually arrives after an async fetch, past this
  // component's first render — re-sync the selection whenever the
  // list changes, same reason NoticeComposer does this for its own
  // recipient dropdown.
  useEffect(() => {
    if (!teachers.some(t => t.id === teacherId)) setTeacherId(teachers[0]?.id ?? '');
  }, [teachers]);

  const sendToTeacher = async () => {
    if (!token || !teacherId || !title.trim() || !body.trim()) return;
    setSendMessage('');
    setSending(true);
    try {
      await api.sendNotice(token, { title, body, targetType: 'TEACHER', targetStaffUserId: teacherId });
      setSendMessage('Message sent to the teacher.');
      setTitle('');
      setBody('');
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendToAdmin = async (_target: NoticeTarget, noticeTitle: string, noticeBody: string) => {
    if (!token) return;
    setSendMessage('');
    try {
      await api.sendNotice(token, { title: noticeTitle, body: noticeBody, targetType: 'ADMIN' });
      setSendMessage('Message sent to the school office.');
    } catch (error) {
      setSendMessage(error instanceof Error ? error.message : 'Could not send message');
    }
  };

  const sortedNotices = useMemo(() => notices.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [notices]);

  return (
    <Screen title="Messages" subtitle="Announcements from the school and your child's teacher.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'messages' ? ' subtab-active' : ''}`} onClick={() => setTab('messages')}>Messages</button>
        <button type="button" className={`subtab${tab === 'compose' ? ' subtab-active' : ''}`} onClick={() => setTab('compose')}>Compose</button>
      </div>

      {tab === 'compose' && (
        <>
          <div className="subtabs">
            <button type="button" className={`subtab${composeTarget === 'teacher' ? ' subtab-active' : ''}`} onClick={() => setComposeTarget('teacher')}>Message Teacher</button>
            <button type="button" className={`subtab${composeTarget === 'admin' ? ' subtab-active' : ''}`} onClick={() => setComposeTarget('admin')}>Message Admin</button>
          </div>
          {sendMessage && <div className="card">{sendMessage}</div>}

          {composeTarget === 'teacher' && (
            teachers.length === 0 ? (
              <p className="empty-text">No teacher assigned to your children's classes yet.</p>
            ) : (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {teachers.length > 1 ? (
                  <select className="input" value={teacherId} onChange={e => setTeacherId(e.target.value)}>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                ) : (
                  <p className="field-label" style={{ margin: 0 }}>To: {teachers[0].label}</p>
                )}
                <input className="input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
                <textarea className="textarea" placeholder="Message" value={body} onChange={e => setBody(e.target.value)} />
                <button type="button" className="btn btn-primary btn-block" onClick={sendToTeacher} disabled={sending}>
                  {sending ? 'Sending…' : 'Send to Teacher'}
                </button>
              </div>
            )
          )}

          {composeTarget === 'admin' && (
            <NoticeComposer allLabel="School Office" sendLabel="Send to School Office" onSend={handleSendToAdmin} />
          )}
        </>
      )}

      {tab === 'messages' && (
        sortedNotices.length === 0 ? (
          <p className="empty-text">No messages yet.</p>
        ) : (
          sortedNotices.map(notice => (
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
        )
      )}
    </Screen>
  );
}
