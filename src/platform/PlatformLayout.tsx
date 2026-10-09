import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardShell } from '../navigation/DashboardShell';

/**
 * The platform area for people who run SDPMPlus (super admins etc.).
 * Each section shows only with the permission it needs; the API checks
 * the same permission on every call.
 */
export function PlatformLayout() {
  const { can } = useAuth();
  return (
    <DashboardShell
      tabs={[
        { to: '/platform/dashboard', label: 'Dashboard', permission: 'platform:view' },
        { to: '/platform/schools', label: 'All Schools', section: 'Schools', permission: 'school:view' },
        { to: '/platform/operations/live', label: 'Live Activity', section: 'Operations', permission: 'pickup:view' },
        { to: '/platform/operations/requests', label: 'Active Requests', section: 'Operations', permission: 'pickup:view' },
        { to: '/platform/operations/attendance', label: 'Attendance', section: 'Operations', permission: 'attendance:view' },
        { to: '/platform/operations/incidents', label: 'Incidents', section: 'Operations', permission: 'pickup:view' },
        { to: '/platform/security-center', label: 'Security Center', section: 'Security & Compliance', permission: 'security:view' },
        { to: '/platform/audit-logs', label: 'Audit Logs', section: 'Security & Compliance', permission: 'audit:view' },
        { to: '/platform/compliance/requests', label: 'Data Requests', section: 'Security & Compliance', permission: 'compliance:view' },
        { to: '/platform/compliance', label: 'Compliance Center', section: 'Security & Compliance', permission: 'compliance:view', end: true },
        { to: '/platform/notifications', label: 'Notifications', section: 'Platform', permission: 'platform:view' },
        { to: '/platform/system', label: 'System Health', section: 'Platform', permission: 'system:view' },
        { to: '/platform/admins', label: 'Platform Administrators', section: 'Platform', permission: 'platform_admin:manage' },
        { to: '/platform/billing/plans', label: 'Plans', section: 'Billing', permission: 'billing:view' },
        { to: '/platform/billing/subscriptions', label: 'School Subscriptions', section: 'Billing', permission: 'billing:view' },
        { to: '/platform/billing/invoices', label: 'Invoices', section: 'Billing', permission: 'billing:view' },
        { to: '/platform/reports', label: 'Reports', section: 'Reports', permission: 'reports:view' },
        { to: '/platform/security', label: 'My Security', section: 'Account' },
      ].filter(tab => !tab.permission || can(tab.permission))}
    >
      <Outlet />
    </DashboardShell>
  );
}
