import { useState } from 'react';
import { Screen } from '../../components/Screen';
import { NoticeComposer, type NoticeTarget } from '../../components/NoticeComposer';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

/** Send a notice to all school parents. */
export function BroadcastScreen() {
  const { token } = useAuth();
  const [message, setMessage] = useState('');

  const handleSend = async (_target: NoticeTarget, title: string, body: string) => {
    if (!token) return;
    setMessage('');
    try {
      await api.sendNotice(token, { title, body, targetType: 'SCHOOL' });
      setMessage('Notice sent to all school parents.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send notice');
    }
  };

  return (
    <Screen title="Broadcast" subtitle="Send an announcement to all school parents.">
      {message && <div className="card">{message}</div>}
      <NoticeComposer
        allLabel="All School Parents"
        onSend={handleSend}
        sendLabel="Send to All School Parents"
      />
    </Screen>
  );
}
