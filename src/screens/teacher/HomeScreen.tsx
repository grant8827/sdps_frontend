import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { QuickAction } from '../../components/QuickAction';
import { SummaryTile } from '../../components/SummaryTile';
import { useAuth } from '../../context/AuthContext';
import { api, type AttendanceRow } from '../../services/api';
import type { QueueItem } from '../../types';
import { getFriendlyDate, getTimeOfDayGreeting } from '../../utils/greeting';

const POLL_MS = 4000;

/** Teacher's Home tab — greeting, today's class snapshot, shortcuts into the other tabs. */
export function HomeScreen() {
  const { user, token } = useAuth();
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => {
      api.teacherQueue(token).then(next => { if (!cancelled) setPending(next); }).catch(() => {});
      api.teacherAttendance(token).then(next => { if (!cancelled) setAttendance(next); }).catch(() => {});
    };
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const presentCount = attendance.filter(row => row.status === 'PRESENT').length;
  const absentCount = attendance.filter(row => row.status === 'ABSENT').length;

  return (
    <Screen title={`${getTimeOfDayGreeting()}, ${user?.fullName ?? ''}`} subtitle={getFriendlyDate()}>
      <div className="tile-grid">
        <SummaryTile label="Pending Requests" value={pending.length} accentColor="#F59E0B" />
        <SummaryTile label="Present Today" value={presentCount} accentColor="#16A34A" />
        <SummaryTile label="Absent Today" value={absentCount} accentColor="#DC2626" />
      </div>

      <QuickAction
        title="Live Queue"
        subtitle="Approve incoming drop-off & pick-up requests"
        badge={pending.length}
        to="/teacher/queue"
      />
      <QuickAction
        title="Class Roster"
        subtitle="Today's attendance for your class"
        to="/teacher/roster"
      />
      <QuickAction
        title="Messages"
        subtitle="Message your class or a specific parent"
        to="/teacher/notices"
      />
    </Screen>
  );
}
