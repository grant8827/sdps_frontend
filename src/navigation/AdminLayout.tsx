import { Outlet } from 'react-router-dom';
import { DashboardShell } from './DashboardShell';

/** Admin console sections — ported from mobile_app's AdminTabNavigator. */
export function AdminLayout() {
  return (
    <DashboardShell
      tabs={[
        { to: '/admin', label: 'Overview', end: true },
        { to: '/admin/queue', label: 'Live Queue' },
        { to: '/admin/faculty', label: 'Faculty' },
        { to: '/admin/classes', label: 'Classes' },
        { to: '/admin/families', label: 'Families' },
        { to: '/admin/students', label: 'Students' },
        { to: '/admin/notices', label: 'Messages' },
        { to: '/admin/setup', label: 'School Setup' },
      ]}
    >
      <Outlet />
    </DashboardShell>
  );
}
