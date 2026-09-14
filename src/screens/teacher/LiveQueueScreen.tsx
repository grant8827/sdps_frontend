import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { QueueList } from '../../components/QueueList';
import { api } from '../../services/api';
import type { QueueItem } from '../../types';

type Tab = 'DROP_OFF' | 'PICK_UP';
const POLL_MS = 4000;

/**
 * Teacher Tab 1 - Live Drop-off & Pick-up Queue, split into Drop-off /
 * Pick-up tabs (same split as Admin's queue, but scoped to this
 * teacher's own class — see admin/LiveQueueScreen for the all-classes
 * view). Ported from mobile_app's LiveQueueScreen.
 *
 * Backed by the real queue_items table now, so a request a parent
 * submits on the mobile app shows up here too — polls rather than
 * pushing, since there's no websocket/live-update transport yet.
 */
export function LiveQueueScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('DROP_OFF');
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.teacherQueue(token).then(next => { if (!cancelled) setQueue(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const approve = async (item: QueueItem) => {
    if (!token) return;
    try { await api.approveQueueItem(token, item.id); setQueue(await api.teacherQueue(token)); }
    catch { /* next poll will reconcile */ }
  };

  const decline = async (item: QueueItem) => {
    if (!token) return;
    try { await api.declineQueueItem(token, item.id); setQueue(await api.teacherQueue(token)); }
    catch { /* next poll will reconcile */ }
  };

  const visible = queue.filter(item => item.requestType === tab);

  return (
    <Screen title="Live Queue" subtitle="Incoming drop-off and pick-up requests for your class.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'DROP_OFF' ? ' subtab-active' : ''}`} onClick={() => setTab('DROP_OFF')}>Drop-off</button>
        <button type="button" className={`subtab${tab === 'PICK_UP' ? ' subtab-active' : ''}`} onClick={() => setTab('PICK_UP')}>Pick-up</button>
      </div>
      <QueueList items={visible} onApprove={approve} onDecline={decline} />
    </Screen>
  );
}
