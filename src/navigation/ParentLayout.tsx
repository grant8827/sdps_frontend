import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { NoticesProvider, useNotices } from '../context/NoticesContext';
import { DashboardShell } from './DashboardShell';

/** Parent's three sections — ported from mobile_app's ParentTabNavigator. */
function ParentShell() {
  const { unreadCount } = useNotices();
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }, []);

  return (
    <DashboardShell
      tabs={[
        { to: '/parent', label: 'Home', end: true },
        { to: '/parent/dropoff-pickup', label: 'Dropoff/Pickup' },
        { to: '/parent/class', label: 'Class' },
        { to: '/parent/notices', label: 'Notices', badge: unreadCount },
        { to: '/parent/add-guardian', label: 'Add Guardian' },
      ]}
    >
      <Outlet />
    </DashboardShell>
  );
}

export function ParentLayout() {
  return (
    <NoticesProvider>
      <ParentShell />
    </NoticesProvider>
  );
}
