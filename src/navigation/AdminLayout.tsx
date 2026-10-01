import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardShell } from './DashboardShell';

/** Admin console sections — ported from mobile_app's AdminTabNavigator. */
// Front desk staff don't get Faculty, Classes, School Setup, the Audit
// Log or Data & Privacy — all admin-only on the backend.
export function AdminLayout() {
  const { canManageSchool, isDistrictAdmin, activeSchoolId } = useAuth();
  return (
    <DashboardShell
      tabs={[
        ...(isDistrictAdmin ? [{ to: '/admin/district', label: 'District' }] : []),
        { to: '/admin', label: 'Overview', end: true },
        { to: '/admin/queue', label: 'Live Queue' },
        ...(canManageSchool ? [{ to: '/admin/faculty', label: 'Faculty' }, { to: '/admin/classes', label: 'Classes' }] : []),
        { to: '/admin/families', label: 'Families' },
        { to: '/admin/students', label: 'Students' },
        { to: '/admin/notices', label: 'Messages' },
        ...(canManageSchool ? [{ to: '/admin/setup', label: 'School Setup' }, { to: '/admin/audit-log', label: 'Audit Log' }, { to: '/admin/data', label: 'Data & Privacy' }] : []),
      ]}
    >
      {/* Remount the page when the school switcher changes, so it reloads that school's data. */}
      <Outlet key={activeSchoolId ?? 'single-school'} />
    </DashboardShell>
  );
}
