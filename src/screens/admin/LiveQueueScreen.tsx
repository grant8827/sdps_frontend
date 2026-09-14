import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { QueueList } from '../../components/QueueList';
import { api } from '../../services/api';
import type { QueueItem } from '../../types';

type Tab = 'DROP_OFF' | 'PICK_UP';
const POLL_MS = 4000;

/**
 * Admin's school-wide Live Queue: same Drop-off / Pick-up tabs as the
 * teacher's queue, but showing every class's requests rather than one
 * teacher's — lets an admin see (and, if needed, approve) what's
 * happening across the whole school. Backed by the real queue_items
 * table, so this reflects requests from any client (mobile or web).
 */
export function LiveQueueScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('DROP_OFF');
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.adminQueue(token).then(next => { if (!cancelled) setQueue(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const approve = async (item: QueueItem) => {
    if (!token) return;
    try { await api.approveQueueItem(token, item.id); setQueue(await api.adminQueue(token)); }
    catch { /* next poll will reconcile */ }
  };

  const decline = async (item: QueueItem) => {
    if (!token) return;
    try { await api.declineQueueItem(token, item.id); setQueue(await api.adminQueue(token)); }
    catch { /* next poll will reconcile */ }
  };

  const visible = queue.filter(item => item.requestType === tab);

  return (
    <Screen title="Live Queue" subtitle="Every class's incoming drop-off and pick-up requests.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'DROP_OFF' ? ' subtab-active' : ''}`} onClick={() => setTab('DROP_OFF')}>Drop-off</button>
        <button type="button" className={`subtab${tab === 'PICK_UP' ? ' subtab-active' : ''}`} onClick={() => setTab('PICK_UP')}>Pick-up</button>
      </div>
      <QueueList items={visible} onApprove={approve} onDecline={decline} />
    </Screen>
  );
}
