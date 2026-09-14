import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

/** Teacher's sections — ported from mobile_app's TeacherTabNavigator. */
export function TeacherLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <Sidebar
          tabs={[
            { to: '/teacher', label: 'Home', end: true },
            { to: '/teacher/queue', label: 'Live Queue' },
            { to: '/teacher/attendance', label: 'Attendance' },
            { to: '/teacher/roster', label: 'Class' },
            { to: '/teacher/notices', label: 'Notices' },
          ]}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
