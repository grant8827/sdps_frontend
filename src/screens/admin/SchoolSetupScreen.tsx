import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { EditIcon, PauseIcon, ResumeIcon, TrashIcon } from '../../components/ActionIcons';
import { api, type CampusProfile, type SchoolProfile } from '../../services/api';
import { emptyAddress, formatAddress, storedAddress, type AddressFields } from '../../utils/address';


const DEFAULT_GEOFENCE_RADIUS = '150';

type Tab = 'profile' | 'location';

interface LocationForm {
  id: string | null; // null = a new location, not saved yet
  name: string;
  address: AddressFields;
  geofenceRadius: string;
  hasCoordinates: boolean; // true once the address has been successfully geocoded — drives the confirmation message below
  startTime: string;
  dismissalTime: string;
  extendedTime: string;
}
const emptyLocation = (): LocationForm => ({
  id: null, name: '', address: emptyAddress(), geofenceRadius: DEFAULT_GEOFENCE_RADIUS, hasCoordinates: false,
  startTime: '', dismissalTime: '', extendedTime: '',
});
// Editing a location: its own saved values, and — for anything it never
// had set — the school-wide value, which is what currently applies to it
// (a location without its own hours uses the school's, and a location
// made at registration may have no address of its own yet). Saving then
// stores them on the location itself.
const toLocationForm = (c: CampusProfile, school: SchoolProfile | null): LocationForm => ({
  id: c.id,
  name: c.name,
  address: storedAddress(c) ?? (school && storedAddress(school)) ?? emptyAddress(),
  geofenceRadius: c.geofenceRadius != null ? String(c.geofenceRadius) : DEFAULT_GEOFENCE_RADIUS,
  hasCoordinates: c.latitude != null && c.longitude != null,
  startTime: c.startTime || school?.startTime || '',
  dismissalTime: c.dismissalTime || school?.dismissalTime || '',
  extendedTime: c.extendedTime || school?.extendedTime || '',
});
const formatDate = (utc?: string) => (utc ? new Date(`${utc.replace(' ', 'T')}Z`).toLocaleDateString() : '—');

/**
 * School Setup, in two tabs:
 * - School Profile: the school's saved locations (date added, location,
 *   school) with edit / suspend / delete actions. The primary location
 *   (the first one) can't be deleted.
 * - Add Location (or Edit Location): one location's name, address,
 *   pickup radius, and daily start / dismissal / extended (daycare)
 *   times — a drop-off after a location's Start Time shows "L" on the
 *   parent's attendance view.
 */
export function SchoolSetupScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('profile');
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [campuses, setCampuses] = useState<CampusProfile[]>([]);
  const [location, setLocation] = useState<LocationForm>(emptyLocation());
  const [message, setMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  const load = async () => {
    if (!token) return;
    const setup = await api.adminSetup(token);
    setSchool(setup.school);
    setCampuses(setup.campuses);
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  // ---- Location table actions ----
  const openLocationForm = (campus: CampusProfile | null) => {
    setLocation(campus ? toLocationForm(campus, school) : emptyLocation());
    setLocationMessage('');
    setTab('location');
  };

  const toggleSuspend = async (campus: CampusProfile) => {
    if (!token) return;
    const suspending = campus.status !== 'SUSPENDED';
    if (suspending && !window.confirm(`Suspend ${campus.name}? Parents won't be able to request drop-off or pick-up there until you reactivate it.`)) return;
    try {
      await api.setCampusActive(token, campus.id, !suspending);
      setMessage(`${campus.name} ${suspending ? 'suspended — drop-off and pick-up are paused there' : 'reactivated'}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update location');
    }
  };

  const remove = async (campus: CampusProfile) => {
    if (!token || !window.confirm(`Delete ${campus.name}? Its students and classes will move to the primary location.`)) return;
    try {
      const { moved } = await api.removeCampus(token, campus.id);
      setMessage(`${campus.name} deleted.${moved.students || moved.classes ? ` ${moved.students} student(s) and ${moved.classes} class(es) moved to the primary location.` : ''}`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete location');
    }
  };

  // ---- Location form ----
  const updateLocation = (patch: Partial<LocationForm>) => setLocation(current => ({ ...current, ...patch }));
  const updateLocationAddress = (key: keyof AddressFields, value: string) =>
    setLocation(current => ({ ...current, address: { ...current.address, [key]: value }, hasCoordinates: false }));

  const saveLocation = async () => {
    if (!token) return;
    if (!location.name.trim()) { setLocationMessage('Location name is required.'); return; }
    if (!location.address.addressLine1.trim() || !location.address.city.trim() || !location.address.state.trim() || !location.address.postalCode.trim()) {
      setLocationMessage('Street address, city, state, and ZIP/postal code are required for the location geofence.'); return;
    }
    const radius = Number(location.geofenceRadius);
    if (!Number.isFinite(radius) || radius <= 0) { setLocationMessage('Geofence radius must be a positive number of meters.'); return; }
    setLocationMessage('Verifying address…');
    setSavingLocation(true);
    try {
      const input = { name: location.name, address: formatAddress(location.address), geofenceRadius: radius, startTime: location.startTime, dismissalTime: location.dismissalTime, extendedTime: location.extendedTime };
      if (location.id) await api.updateCampus(token, location.id, input);
      else await api.addCampus(token, input);
      // The backend only accepts an address it could map, so a successful
      // save means the pickup area is set.
      await load();
      setMessage(`${location.name} saved and mapped successfully.`);
      setLocation(emptyLocation());
      setTab('profile');
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : 'Could not save location');
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <Screen title="School Setup" subtitle="Your school's locations, their pickup areas and hours.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'profile' ? ' subtab-active' : ''}`} onClick={() => setTab('profile')}>School Profile</button>
        <button type="button" className={`subtab${tab === 'location' ? ' subtab-active' : ''}`} onClick={() => openLocationForm(null)}>
          {tab === 'location' && location.id ? 'Edit Location' : 'Add Location'}
        </button>
      </div>

      {tab === 'profile' && (
        <>
          {message && <div className="card">{message}</div>}

          <p className="form-title" style={{ margin: '4px 0' }}>Locations</p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Date added</th><th>Location</th><th>School</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {campuses.map(campus => {
                  const suspended = campus.status === 'SUSPENDED';
                  return (
                    <tr key={campus.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(campus.createdAt)}</td>
                      <td>
                        <strong>{campus.name}</strong>
                        {campus.isPrimary && <span className="pill" style={{ marginLeft: 8, backgroundColor: 'var(--blue)' }}>Primary</span>}
                        <div className="field-label" style={{ margin: 0 }}>{campus.address || 'No address yet'}</div>
                      </td>
                      <td>{school?.name}</td>
                      <td>
                        <span className="pill" style={{ backgroundColor: suspended ? 'var(--amber)' : 'var(--green)', color: suspended ? 'var(--on-amber)' : undefined }}>{suspended ? 'Suspended' : 'Active'}</span>
                      </td>
                      <td>
                        <div className="icon-actions">
                          <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${campus.name}`} onClick={() => openLocationForm(campus)}><EditIcon /></button>
                          <button
                            type="button"
                            className="icon-btn"
                            title={suspended ? 'Reactivate' : 'Suspend'}
                            aria-label={`${suspended ? 'Reactivate' : 'Suspend'} ${campus.name}`}
                            onClick={() => toggleSuspend(campus)}
                          >
                            {suspended ? <ResumeIcon /> : <PauseIcon />}
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title={campus.isPrimary ? "The primary location can't be deleted" : 'Delete'}
                            aria-label={`Delete ${campus.name}`}
                            disabled={campus.isPrimary}
                            onClick={() => remove(campus)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {campuses.length === 0 && <tr><td colSpan={5} className="empty-text">No locations yet — use the Add Location tab to set the drop-off/pick-up area.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'location' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="form-title" style={{ margin: 0 }}>{location.id ? `Edit ${location.name || 'location'}` : 'New Location'}</p>

          <p className="field-label" style={{ margin: 0 }}>Location Name</p>
          <input className="input" value={location.name} onChange={e => updateLocation({ name: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>School Location Address</p>
          <input className="input" autoComplete="address-line1" placeholder="Street address" value={location.address.addressLine1} onChange={e => updateLocationAddress('addressLine1', e.target.value)} />
          <input className="input" autoComplete="address-line2" placeholder="Suite, unit, building (optional)" value={location.address.addressLine2} onChange={e => updateLocationAddress('addressLine2', e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(90px, 1fr)', gap: 10 }}>
            <input className="input" autoComplete="address-level2" placeholder="City" value={location.address.city} onChange={e => updateLocationAddress('city', e.target.value)} />
            <input className="input" autoComplete="address-level1" placeholder="State/Province" value={location.address.state} onChange={e => updateLocationAddress('state', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) minmax(0, 2fr)', gap: 10 }}>
            <input className="input" autoComplete="postal-code" placeholder="ZIP/Postal code" value={location.address.postalCode} onChange={e => updateLocationAddress('postalCode', e.target.value)} />
            <input className="input" autoComplete="country-name" placeholder="Country" value={location.address.country} onChange={e => updateLocationAddress('country', e.target.value)} />
          </div>

          <p className="field-label" style={{ margin: 0 }}>Pickup/Drop-off Radius (meters)</p>
          <input className="input" type="number" min={1} value={location.geofenceRadius} onChange={e => updateLocation({ geofenceRadius: e.target.value })} />
          <p className="field-label" style={{ margin: 0 }}>
            {location.hasCoordinates
              ? '📍 Located — drop-off/pick-up will require being within this radius of the address above.'
              : 'A parent must be within this radius of the address above for drop-off/pick-up to activate.'}
          </p>

          <p className="field-label" style={{ margin: 0 }}>Start Time</p>
          <input className="input" type="time" value={location.startTime} onChange={e => updateLocation({ startTime: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>Dismissal Time</p>
          <input className="input" type="time" value={location.dismissalTime} onChange={e => updateLocation({ dismissalTime: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>Extended Time (Daycare Dismissal)</p>
          <input className="input" type="time" value={location.extendedTime} onChange={e => updateLocation({ extendedTime: e.target.value })} />

          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={saveLocation} disabled={savingLocation}>
              {savingLocation ? 'Saving…' : location.id ? 'Save Changes' : 'Save Location'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setTab('profile')}>Cancel</button>
          </div>
          {locationMessage && <p className="field-label" style={{ margin: 0 }}>{locationMessage}</p>}
        </div>
      )}
    </Screen>
  );
}
