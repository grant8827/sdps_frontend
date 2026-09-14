import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import type { Child } from '../../types';
import { CHILD_STATUS_COLOR, CHILD_STATUS_LABEL } from '../../utils/childStatus';
import { api } from '../../services/api';

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

  const currentLocation = () => new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not supported by this browser.'));
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error('Allow location access to use drop-off and pick-up.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
    );
  });

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
    try { await api.requestDropOff(token, child.id, await currentLocation()); setChildren(await api.myStudents(token)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit drop-off'); }
  };

  const requestPickUp = async (child: Child) => {
    if (!token) return;
    setMessage('');
    try { await api.requestPickUp(token, child.id, await currentLocation()); setChildren(await api.myStudents(token)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not submit pick-up'); }
  };

  return (
    <Screen title="Drop-off & Pick-up" subtitle="Alert your child's teacher when you arrive.">
      {message && <div className="card">{message}</div>}
      {children.length === 0 ? (
        <p className="empty-text">No children linked to this account yet.</p>
      ) : (
        children.map(child => (
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
                disabled={child.status !== 'AT_HOME'}
                onClick={() => requestDropOff(child)}
              >
                Drop Off
              </button>
              <button
                type="button"
                className="btn btn-purple"
                disabled={child.status !== 'PRESENT'}
                onClick={() => requestPickUp(child)}
              >
                Pick Up
              </button>
            </div>
          </div>
        ))
      )}
    </Screen>
  );
}
