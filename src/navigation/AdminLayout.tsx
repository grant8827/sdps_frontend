import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

/** Admin console sections — ported from mobile_app's AdminTabNavigator. */
export function AdminLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <Sidebar
          tabs={[
            { to: '/admin', label: 'Overview', end: true },
            { to: '/admin/queue', label: 'Live Queue' },
            { to: '/admin/faculty', label: 'Faculty' },
            { to: '/admin/classes', label: 'Classes' },
            { to: '/admin/families', label: 'Families' },
            { to: '/admin/students', label: 'Students' },
            { to: '/admin/broadcast', label: 'Broadcast' },
            { to: '/admin/setup', label: 'School Setup' },
          ]}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
