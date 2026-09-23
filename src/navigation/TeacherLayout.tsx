import { Outlet } from 'react-router-dom';
import { DashboardShell } from './DashboardShell';

/** Teacher's sections — ported from mobile_app's TeacherTabNavigator. */
export function TeacherLayout() {
  return (
    <DashboardShell
      tabs={[
        { to: '/teacher', label: 'Home', end: true },
        { to: '/teacher/queue', label: 'Live Queue' },
        { to: '/teacher/attendance', label: 'Attendance' },
        { to: '/teacher/roster', label: 'Class' },
        { to: '/teacher/notices', label: 'Messages' },
      ]}
    >
      <Outlet />
    </DashboardShell>
  );
}
