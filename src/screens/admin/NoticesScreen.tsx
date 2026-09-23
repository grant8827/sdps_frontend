import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { PersonPickerModal } from '../../components/PersonPickerModal';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Notice } from '../../types';

type Tab = 'messages' | 'send';
type Audience = 'ALL_STAFF' | 'ONE_STAFF' | 'ALL_PARENTS' | 'ONE_PARENT';

const STAFF_ROLE_LABELS: Record<string, string> = { teacher: 'Teacher', school_admin: 'Admin', staff: 'Front Desk / Office Staff' };

/**
 * Admin's Messages screen: the Messages tab is this admin's own inbox
 * (All Staff broadcasts, plus anything addressed to them specifically —
 * same feed a teacher sees in the teacher app); Send Message is one
 * composer with a single audience nav (All Staff / One Staff / All
 * Parents / One Parent) — picking "One ___" opens a searchable popup to
 * choose exactly who.
 */
export function NoticesScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState<Notice[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ id: string; label: string }[]>([]);
  const [parentOptions, setParentOptions] = useState<{ id: string; label: string }[]>([]);

  const [audience, setAudience] = useState<Audience>('ALL_STAFF');
  const [staffId, setStaffId] = useState('');
  const [parentId, setParentId] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!token) return;
    const [nextMessages, staff, guardians] = await Promise.all([api.staffNotices(token), api.staff(token), api.guardians(token)]);
    setMessages(nextMessages);
    setStaffOptions(staff.map(s => ({ id: s.id, label: `${s.fullName} (${STAFF_ROLE_LABELS[s.role] || s.role})` })));
    setParentOptions(guardians.map(g => ({ id: g.userId, label: g.fullName })));
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const markRead = async (noticeId: string) => {
    if (!token) return;
    setMessages(prev => prev.map(n => (n.id === noticeId ? { ...n, read: true } : n)));
    api.markNoticeRead(token, noticeId).catch(() => {});
  };

  const selectAudience = (next: Audience) => {
    setAudience(next);
    if (next === 'ONE_STAFF' && !staffId) setPickerOpen(true);
    if (next === 'ONE_PARENT' && !parentId) setPickerOpen(true);
  };

  const pickedName = audience === 'ONE_STAFF'
    ? staffOptions.find(o => o.id === staffId)?.label
    : audience === 'ONE_PARENT'
      ? parentOptions.find(o => o.id === parentId)?.label
      : undefined;

  const send = async () => {
    if (!token || !title.trim() || !body.trim()) return;
    if (audience === 'ONE_STAFF' && !staffId) { setPickerOpen(true); return; }
    if (audience === 'ONE_PARENT' && !parentId) { setPickerOpen(true); return; }
    setMessage('');
    setSending(true);
    try {
      if (audience === 'ALL_STAFF' || audience === 'ONE_STAFF') {
        await api.sendNotice(token, { title, body, targetType: 'STAFF', targetStaffUserId: audience === 'ONE_STAFF' ? staffId : undefined });
      } else {
        await api.sendNotice(token, { title, body, targetType: audience === 'ALL_PARENTS' ? 'SCHOOL' : 'PARENT', targetParentUserId: audience === 'ONE_PARENT' ? parentId : undefined });
      }
      setMessage('Message sent.');
      setTitle('');
      setBody('');
      setStaffId('');
      setParentId('');
      setAudience('ALL_STAFF');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title="Messages" subtitle="Send and review messages to staff and parents.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'messages' ? ' subtab-active' : ''}`} onClick={() => setTab('messages')}>Messages</button>
        <button type="button" className={`subtab${tab === 'send' ? ' subtab-active' : ''}`} onClick={() => setTab('send')}>Send Message</button>
      </div>
      {message && <div className="card">{message}</div>}

      {tab === 'send' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="field-label" style={{ margin: 0 }}>Send to</p>
          <div className="chip-row">
            <button type="button" className={`chip${audience === 'ALL_STAFF' ? ' chip-active' : ''}`} onClick={() => selectAudience('ALL_STAFF')}>All Staff</button>
            <button type="button" className={`chip${audience === 'ONE_STAFF' ? ' chip-active' : ''}`} onClick={() => selectAudience('ONE_STAFF')}>One Staff</button>
            <button type="button" className={`chip${audience === 'ALL_PARENTS' ? ' chip-active' : ''}`} onClick={() => selectAudience('ALL_PARENTS')}>All Parents</button>
            <button type="button" className={`chip${audience === 'ONE_PARENT' ? ' chip-active' : ''}`} onClick={() => selectAudience('ONE_PARENT')}>One Parent</button>
          </div>

          {(audience === 'ONE_STAFF' || audience === 'ONE_PARENT') && (
            <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setPickerOpen(true)}>
              {pickedName ? `To: ${pickedName}` : `Choose a ${audience === 'ONE_STAFF' ? 'staff member' : 'parent'}`}
            </button>
          )}

          <input className="input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="textarea" placeholder="Message" value={body} onChange={e => setBody(e.target.value)} />

          <button type="button" className="btn btn-primary btn-block" onClick={send} disabled={sending}>
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      )}

      {pickerOpen && (
        <PersonPickerModal
          title={audience === 'ONE_STAFF' ? 'Select Staff Member' : 'Select Parent'}
          options={audience === 'ONE_STAFF' ? staffOptions : parentOptions}
          onSelect={id => {
            if (audience === 'ONE_STAFF') setStaffId(id); else setParentId(id);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {tab === 'messages' && (
        messages.length === 0 ? (
          <p className="empty-text">No messages yet.</p>
        ) : (
          messages.map(notice => (
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
