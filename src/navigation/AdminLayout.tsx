import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardShell } from './DashboardShell';
import { PolicyPrompt } from '../components/PolicyPrompt';

/** Admin console sections — ported from mobile_app's AdminTabNavigator. */
// Front desk staff don't get Faculty, Classes, School Setup, the Audit
// Log or Data & Privacy — all admin-only on the backend.
export function AdminLayout() {
  const { token, canManageSchool: canManage, isDistrictAdmin, activeSchoolId, supportSession } = useAuth();
  const { pathname } = useLocation();
  // Adults waiting in Families → Pending Approvals, shown on the Families
  // item; re-checked on every page change so it drops once they're decided.
  const [pendingApprovals, setPendingApprovals] = useState(0);
  useEffect(() => {
    if (!token || !canManage) { setPendingApprovals(0); return; }
    api.guardianRequests(token)
      .then(requests => setPendingApprovals(requests.filter(r => r.status === 'PENDING').length))
      .catch(() => {});
  }, [token, canManage, activeSchoolId, pathname]);
  useEffect(() => {
    const onChange = (event: Event) => setPendingApprovals((event as CustomEvent<number>).detail);
    window.addEventListener('pending-approvals', onChange);
    return () => window.removeEventListener('pending-approvals', onChange);
  }, []);
  // A support session sees every section; changes are refused server-side unless allowed.
  const canManageSchool = canManage || Boolean(supportSession);
  return (
    <DashboardShell
      tabs={[
        ...(isDistrictAdmin ? [{ to: '/admin/district', label: 'District' }] : []),
        { to: '/admin', label: 'Overview', end: true },
        { to: '/admin/queue', label: 'Live Queue' },
        ...(canManageSchool ? [{ to: '/admin/faculty', label: 'Faculty' }, { to: '/admin/classes', label: 'Classes' }] : []),
        { to: '/admin/families', label: 'Families', badge: pendingApprovals },
        { to: '/admin/students', label: 'Students' },
        { to: '/admin/notices', label: 'Messages' },
        ...(canManageSchool ? [{ to: '/admin/setup', label: 'School Setup' }, { to: '/admin/audit-log', label: 'Audit Log' }, { to: '/admin/data', label: 'Data & Privacy' }] : []),
        { to: '/admin/legal', label: 'Legal & Policies' },
      ]}
    >
      {/* Remount the page when the school switcher changes, so it reloads that school's data. */}
      <Outlet key={activeSchoolId ?? 'single-school'} />
      {/* School administrators are asked to read Legal & Policies until someone confirms it. */}
      {canManage && !supportSession && <PolicyPrompt key={`policies-${activeSchoolId ?? 'single-school'}`} />}
    </DashboardShell>
  );
}
