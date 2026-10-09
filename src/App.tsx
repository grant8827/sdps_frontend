import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { HomePage } from './marketing/HomePage';
import { LoginScreen } from './screens/auth/LoginScreen';
import { RegisterSchoolScreen } from './screens/auth/RegisterSchoolScreen';
import { ForgotPasswordScreen } from './screens/auth/ForgotPasswordScreen';
import { SetPasswordScreen } from './screens/auth/SetPasswordScreen';
import { SetPinScreen } from './screens/auth/SetPinScreen';

import { ParentLayout } from './navigation/ParentLayout';
import { HomeScreen as ParentHomeScreen } from './screens/parent/HomeScreen';
import { DropoffPickupScreen } from './screens/parent/DropoffPickupScreen';
import { ClassAttendanceScreen } from './screens/parent/ClassAttendanceScreen';
import { NoticesScreen } from './screens/parent/NoticesScreen';
import { AddGuardianScreen } from './screens/parent/AddGuardianScreen';

import { TeacherLayout } from './navigation/TeacherLayout';
import { HomeScreen as TeacherHomeScreen } from './screens/teacher/HomeScreen';
import { LiveQueueScreen } from './screens/teacher/LiveQueueScreen';
import { AttendanceScreen as TeacherAttendanceScreen } from './screens/teacher/AttendanceScreen';
import { ClassRosterScreen } from './screens/teacher/ClassRosterScreen';
import { NoticesScreen as TeacherNoticesScreen } from './screens/teacher/NoticesScreen';

import { AdminLayout } from './navigation/AdminLayout';
import { OverviewScreen } from './screens/admin/OverviewScreen';
import { FacultyManagementScreen } from './screens/admin/FacultyManagementScreen';
import { FamilyManagementScreen } from './screens/admin/FamilyManagementScreen';
import { NoticesScreen as AdminNoticesScreen } from './screens/admin/NoticesScreen';
import { StudentManagementScreen } from './screens/admin/StudentManagementScreen';
import { LiveQueueScreen as AdminLiveQueueScreen } from './screens/admin/LiveQueueScreen';
import { ClassManagementScreen } from './screens/admin/ClassManagementScreen';
import { SchoolSetupScreen } from './screens/admin/SchoolSetupScreen';
import { AuditLogScreen } from './screens/admin/AuditLogScreen';
import { SecurityScreen } from './screens/shared/SecurityScreen';
import { DataPrivacyScreen } from './screens/admin/DataPrivacyScreen';
import { DistrictOverviewScreen } from './screens/admin/DistrictOverviewScreen';
import { LegalPage } from './legal/LegalPage';

import { PlatformLayout } from './platform/PlatformLayout';
import { SchoolsScreen } from './platform/SchoolsScreen';
import { SchoolDetailScreen } from './platform/SchoolDetailScreen';
import { AuditLogsScreen } from './platform/AuditLogsScreen';
import { AdminsScreen } from './platform/AdminsScreen';
import { DashboardScreen } from './platform/DashboardScreen';
import { LiveActivityScreen } from './platform/operations/LiveActivityScreen';
import { ActiveRequestsScreen } from './platform/operations/ActiveRequestsScreen';
import { AttendanceOverviewScreen } from './platform/operations/AttendanceOverviewScreen';
import { IncidentsScreen } from './platform/operations/IncidentsScreen';
import { SecurityCenterScreen } from './platform/security/SecurityCenterScreen';
import { ComplianceCenterScreen } from './platform/compliance/ComplianceCenterScreen';
import { DataRequestsScreen } from './platform/compliance/DataRequestsScreen';
import { DataRequestDetailScreen } from './platform/compliance/DataRequestDetailScreen';
import { NotificationsScreen } from './platform/notifications/NotificationsScreen';
import { ReportsScreen } from './platform/reports/ReportsScreen';
import { PlansScreen } from './platform/billing/PlansScreen';
import { SubscriptionsScreen } from './platform/billing/SubscriptionsScreen';
import { InvoiceDetailScreen, InvoicesScreen } from './platform/billing/InvoicesScreen';
import { SystemHealthScreen } from './platform/system/SystemHealthScreen';

/**
 * Root router — the web equivalent of mobile_app's RootNavigator.
 * "App automatically routes users upon login": Parent -> /parent,
 * Teacher -> /teacher, Admin -> /admin. Session restore/expiry is
 * handled by AuthContext; this component only reacts to its output.
 */
function AppRoutes() {
  const { user, isRestoring, supportSession, can } = useAuth();

  if (isRestoring) {
    return (
      <div className="spinner-page">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterSchoolScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/set-password" element={<SetPasswordScreen />} />
        <Route path="/set-pin" element={<SetPinScreen />} />
        <Route path="/legal/:slug" element={<LegalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Platform admins land in the platform area — or, during a support
  // session, in the school's admin dashboard. They only get the admin
  // dashboard otherwise if they're also a school admin themselves.
  const isPlatform = Boolean(user.platform);
  const hasSchoolDashboard = !isPlatform || Boolean(supportSession) || (user.memberships?.length ?? 0) > 0;
  const homePath = isPlatform && !supportSession
    ? '/platform'
    : user.role === 'parent' ? '/parent' : user.role === 'teacher' ? '/teacher' : '/admin';
  const platformHome = can('platform:view') ? '/platform/dashboard' : can('school:view') ? '/platform/schools' : can('audit:view') ? '/platform/audit-logs' : '/platform/security';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="/login" element={<Navigate to={homePath} replace />} />
      <Route path="/register" element={<Navigate to={homePath} replace />} />
      <Route path="/forgot-password" element={<Navigate to={homePath} replace />} />
      <Route path="/set-password" element={<SetPasswordScreen />} />
      <Route path="/set-pin" element={<SetPinScreen />} />
      <Route path="/legal/:slug" element={<LegalPage />} />

      {user.role === 'parent' && (
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentHomeScreen />} />
          <Route path="dropoff-pickup" element={<DropoffPickupScreen />} />
          <Route path="class" element={<ClassAttendanceScreen />} />
          <Route path="notices" element={<NoticesScreen />} />
          <Route path="add-guardian" element={<AddGuardianScreen />} />
          <Route path="security" element={<SecurityScreen />} />
        </Route>
      )}

      {user.role === 'teacher' && (
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherHomeScreen />} />
          <Route path="queue" element={<LiveQueueScreen />} />
          <Route path="attendance" element={<TeacherAttendanceScreen />} />
          <Route path="roster" element={<ClassRosterScreen />} />
          <Route path="notices" element={<TeacherNoticesScreen />} />
          <Route path="security" element={<SecurityScreen />} />
        </Route>
      )}

      {isPlatform && (
        <Route path="/platform" element={<PlatformLayout />}>
          <Route index element={<Navigate to={platformHome} replace />} />
          {can('platform:view') && <Route path="dashboard" element={<DashboardScreen />} />}
          {can('school:view') && <Route path="schools" element={<SchoolsScreen />} />}
          {can('school:view') && <Route path="schools/:schoolId" element={<SchoolDetailScreen />} />}
          {can('pickup:view') && <Route path="operations/live" element={<LiveActivityScreen />} />}
          {can('pickup:view') && <Route path="operations/requests" element={<ActiveRequestsScreen />} />}
          {can('attendance:view') && <Route path="operations/attendance" element={<AttendanceOverviewScreen />} />}
          {can('pickup:view') && <Route path="operations/incidents" element={<IncidentsScreen />} />}
          {can('audit:view') && <Route path="audit-logs" element={<AuditLogsScreen />} />}
          {can('security:view') && <Route path="security-center" element={<SecurityCenterScreen />} />}
          {can('compliance:view') && <Route path="compliance" element={<ComplianceCenterScreen />} />}
          {can('compliance:view') && <Route path="compliance/requests" element={<DataRequestsScreen />} />}
          {can('compliance:view') && <Route path="compliance/requests/:requestId" element={<DataRequestDetailScreen />} />}
          {can('platform_admin:manage') && <Route path="admins" element={<AdminsScreen />} />}
          {can('platform:view') && <Route path="notifications" element={<NotificationsScreen />} />}
          {can('reports:view') && <Route path="reports" element={<ReportsScreen />} />}
          {can('system:view') && <Route path="system" element={<SystemHealthScreen />} />}
          {can('billing:view') && <Route path="billing/plans" element={<PlansScreen />} />}
          {can('billing:view') && <Route path="billing/subscriptions" element={<SubscriptionsScreen />} />}
          {can('billing:view') && <Route path="billing/invoices" element={<InvoicesScreen />} />}
          {can('billing:view') && <Route path="billing/invoices/:invoiceId" element={<InvoiceDetailScreen />} />}
          <Route path="security" element={<SecurityScreen />} />
        </Route>
      )}

      {user.role === 'admin' && hasSchoolDashboard && (
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<OverviewScreen />} />
          <Route path="queue" element={<AdminLiveQueueScreen />} />
          <Route path="faculty" element={<FacultyManagementScreen />} />
          <Route path="classes" element={<ClassManagementScreen />} />
          <Route path="families" element={<FamilyManagementScreen />} />
          <Route path="students" element={<StudentManagementScreen />} />
          <Route path="notices" element={<AdminNoticesScreen />} />
          <Route path="setup" element={<SchoolSetupScreen />} />
          <Route path="audit-log" element={<AuditLogScreen />} />
          <Route path="data" element={<DataPrivacyScreen />} />
          <Route path="district" element={<DistrictOverviewScreen />} />
          <Route path="security" element={<SecurityScreen />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
