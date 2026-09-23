import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import { HomePage } from './marketing/HomePage';
import { LoginScreen } from './screens/auth/LoginScreen';
import { RegisterSchoolScreen } from './screens/auth/RegisterSchoolScreen';

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

/**
 * Root router — the web equivalent of mobile_app's RootNavigator.
 * "App automatically routes users upon login": Parent -> /parent,
 * Teacher -> /teacher, Admin -> /admin. Session restore/expiry is
 * handled by AuthContext; this component only reacts to its output.
 */
function AppRoutes() {
  const { user, isRestoring } = useAuth();

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  const homePath = user.role === 'parent' ? '/parent' : user.role === 'teacher' ? '/teacher' : '/admin';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="/login" element={<Navigate to={homePath} replace />} />
      <Route path="/register" element={<Navigate to={homePath} replace />} />

      {user.role === 'parent' && (
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentHomeScreen />} />
          <Route path="dropoff-pickup" element={<DropoffPickupScreen />} />
          <Route path="class" element={<ClassAttendanceScreen />} />
          <Route path="notices" element={<NoticesScreen />} />
          <Route path="add-guardian" element={<AddGuardianScreen />} />
        </Route>
      )}

      {user.role === 'teacher' && (
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherHomeScreen />} />
          <Route path="queue" element={<LiveQueueScreen />} />
          <Route path="attendance" element={<TeacherAttendanceScreen />} />
          <Route path="roster" element={<ClassRosterScreen />} />
          <Route path="notices" element={<TeacherNoticesScreen />} />
        </Route>
      )}

      {user.role === 'admin' && (
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<OverviewScreen />} />
          <Route path="queue" element={<AdminLiveQueueScreen />} />
          <Route path="faculty" element={<FacultyManagementScreen />} />
          <Route path="classes" element={<ClassManagementScreen />} />
          <Route path="families" element={<FamilyManagementScreen />} />
          <Route path="students" element={<StudentManagementScreen />} />
          <Route path="notices" element={<AdminNoticesScreen />} />
          <Route path="setup" element={<SchoolSetupScreen />} />
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
