import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { QuickAction } from '../../components/QuickAction';
import { useAuth } from '../../context/AuthContext';
import { useNotices } from '../../context/NoticesContext';
import type { Child } from '../../types';
import { CHILD_STATUS_COLOR, CHILD_STATUS_LABEL } from '../../utils/childStatus';
import { getFriendlyDate, getTimeOfDayGreeting } from '../../utils/greeting';
import { api } from '../../services/api';

const POLL_MS = 4000;

/**
 * Parent's Home tab — greeting, at-a-glance child status, shortcuts
 * into the other tabs. Polls /me/students so a teacher's (or admin's)
 * approval from any device shows up here without a manual refresh.
 */
export function HomeScreen() {
  const { user, token } = useAuth();
  const { unreadCount } = useNotices();
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.myStudents(token).then(next => { if (!cancelled) setChildren(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const firstName = user?.fullName.split(' ')[0] ?? 'there';

  return (
    <Screen title={`${getTimeOfDayGreeting()}, ${firstName}`} subtitle={getFriendlyDate()}>
      <p className="card-title" style={{ margin: '4px 0' }}>Your children</p>
      {children.length === 0 ? (
        <div className="card">
          <p className="empty-text">No children linked to this account yet.</p>
        </div>
      ) : (
        children.map(child => (
          <div key={child.id} className="card card-row">
            {child.photoUrl ? (
              <img src={child.photoUrl} alt="" className="avatar" style={{ width: 48, height: 48 }} />
            ) : (
              <span className="avatar avatar-placeholder" style={{ width: 48, height: 48, fontSize: 18 }}>{child.fullName.charAt(0)}</span>
            )}
            <div style={{ flex: 1, marginLeft: 12 }}>
              <span className="quick-action-title" style={{ fontSize: 17, display: 'block' }}>{child.fullName}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{child.className || 'Unassigned'}</span>
            </div>
            <span className="pill" style={{ backgroundColor: CHILD_STATUS_COLOR[child.status] }}>
              {CHILD_STATUS_LABEL[child.status]}
            </span>
          </div>
        ))
      )}

      <QuickAction
        title="Drop-off & Pick-up"
        subtitle="Alert the teacher when you arrive"
        to="/parent/dropoff-pickup"
      />
      <QuickAction
        title="Class & Attendance"
        subtitle="Weekly attendance and homeroom info"
        to="/parent/class"
      />
      <QuickAction
        title="Notices"
        subtitle="Announcements from school and teachers"
        badge={unreadCount}
        to="/parent/notices"
      />
    </Screen>
  );
}
