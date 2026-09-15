import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../types';
import { CHILD_STATUS_COLOR, CHILD_STATUS_LABEL } from '../../utils/childStatus';
import { api } from '../../services/api';
import { isAtCampus, type Position } from '../../utils/geofence';

const POLL_MS = 4000;

/**
 * Parent Tab 1 - Drop-off & Pick-up Screen. Ported from mobile_app's
 * DropoffPickupScreen.
 *
 * Backed by the real backend: requesting a drop-off/pick-up hits
 * queue_items directly, and this polls /me/students so a teacher's
 * (or admin's) approval — from any device — shows up here without a
 * manual refresh. No websocket transport yet, hence polling.
 */
export function DropoffPickupScreen() {
  const { token } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [locationError, setLocationError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!navigator.geolocation) { setLocationError('Location is not supported by this browser.'); return; }
    const watch = navigator.geolocation.watchPosition(
      fix => { setPosition({ latitude: fix.coords.latitude, longitude: fix.coords.longitude, accuracy: fix.coords.accuracy, timestamp: Date.now() }); setLocationError(''); },
      () => { setPosition(null); setLocationError('Allow location access to enable drop-off and pick-up.'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => { navigator.geolocation.clearWatch(watch); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = () => api.myStudents(token).then(next => { if (!cancelled) setChildren(next); }).catch(() => {});
    load();
    const interval = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const requestDropOff = async (child: Child) => {
    if (!token) return;
    setMessage('');
    try {
      if (!isAtCampus(position, child)) throw new Error('Move within the school location to drop off.');
      await api.requestDropOff(token, child.id, { latitude: position!.latitude, longitude: position!.longitude }); setChildren(await api.myStudents(token));
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit drop-off'); }
  };

  const requestPickUp = async (child: Child) => {
    if (!token) return;
    setMessage('');
    try {
      if (!isAtCampus(position, child)) throw new Error('Move within the school location to pick up.');
      await api.requestPickUp(token, child.id, { latitude: position!.latitude, longitude: position!.longitude }); setChildren(await api.myStudents(token));
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit pick-up'); }
  };

  return (
    <Screen title="Drop-off & Pick-up" subtitle="Alert your child's teacher when you arrive.">
      {message && <div className="card">{message}</div>}
      {locationError && <div className="card">{locationError}</div>}
      {children.length === 0 ? (
        <p className="empty-text">No children linked to this account yet.</p>
      ) : (
        children.map(child => {
          // `now` triggers reevaluation when a GPS fix becomes stale.
          void now;
          const atCampus = isAtCampus(position, child);
          return (
          <div key={child.id} className="card">
            <div className="card-header">
              <span className="quick-action-title" style={{ fontSize: 17 }}>{child.fullName}</span>
              <span className="pill" style={{ backgroundColor: CHILD_STATUS_COLOR[child.status] }}>
                {CHILD_STATUS_LABEL[child.status]}
              </span>
            </div>

            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={child.status !== 'AT_HOME' || !atCampus}
                onClick={() => requestDropOff(child)}
              >
                Drop Off
              </button>
              <button
                type="button"
                className="btn btn-purple"
                disabled={child.status !== 'PRESENT' || !atCampus}
                onClick={() => requestPickUp(child)}
              >
                Pick Up
              </button>
            </div>
            {!atCampus && <p className="field-label">{child.latitude == null || child.longitude == null ? 'School location is not configured yet.' : position ? 'Move within the school pickup/drop-off radius to enable these buttons.' : 'Turn on location to enable these buttons.'}</p>}
          </div>
          );
        })
      )}
    </Screen>
  );
}
