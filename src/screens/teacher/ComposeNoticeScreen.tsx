import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { NoticeComposer, type NoticeTarget, type ParentOption } from '../../components/NoticeComposer';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

/** Compose to "All Class Parents" or one specific parent, picked from a real dropdown of your class's guardians. */
export function ComposeNoticeScreen() {
  const { token } = useAuth();
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api.teacherParents(token)
      .then(rows => setParents(rows.map(row => ({ id: row.id, label: row.fullName }))))
      .catch(() => {});
  }, [token]);

  const handleSend = async (target: NoticeTarget, title: string, body: string) => {
    if (!token) return;
    setMessage('');
    try {
      await api.sendNotice(token, {
        title,
        body,
        targetType: target.type === 'ALL' ? 'CLASS' : 'PARENT',
        targetParentUserId: target.type === 'PARENT' ? target.parentUserId : undefined,
      });
      setMessage('Notice sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send notice');
    }
  };

  return (
    <Screen title="Compose Notice" subtitle="Message your class or a specific parent.">
      {message && <div className="card">{message}</div>}
      <NoticeComposer
        allLabel="All Class Parents"
        parentOptions={parents}
        onSend={handleSend}
      />
    </Screen>
  );
}
