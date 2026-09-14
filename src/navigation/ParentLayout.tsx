import { Outlet } from 'react-router-dom';
import { NoticesProvider, useNotices } from '../context/NoticesContext';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

/** Parent's three sections — ported from mobile_app's ParentTabNavigator. */
function ParentShell() {
  const { unreadCount } = useNotices();

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <Sidebar
          tabs={[
            { to: '/parent', label: 'Home', end: true },
            { to: '/parent/dropoff-pickup', label: 'Dropoff/Pickup' },
            { to: '/parent/class', label: 'Class' },
            { to: '/parent/notices', label: 'Notices', badge: unreadCount },
            { to: '/parent/add-guardian', label: 'Add Guardian' },
          ]}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function ParentLayout() {
  return (
    <NoticesProvider>
      <ParentShell />
    </NoticesProvider>
  );
}
