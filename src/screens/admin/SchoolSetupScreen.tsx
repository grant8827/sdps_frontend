import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { emptyAddress, formatAddress, parseAddress, type AddressFields } from '../../utils/address';

const emptyForm = { name: '', address: emptyAddress(), startTime: '', dismissalTime: '', extendedTime: '' };

const DEFAULT_GEOFENCE_RADIUS = '150';

interface LocationForm {
  id: string | null; // null = not saved yet (added via "+ Add Another Location")
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

/**
 * School profile: name, the daily start/dismissal times used to flag a
 * late drop-off ("L" on the parent's attendance view — see
 * AttendanceScreen), and an extended-time (daycare/aftercare) dismissal
 * time for students marked daycare on the Students tab. Below that,
 * per-location hours — some schools run more than one site on a
 * different bell schedule, so each location repeats the same fields
 * and saves independently.
 */
export function SchoolSetupScreen() {
  const { token } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [locations, setLocations] = useState<LocationForm[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [locationMessages, setLocationMessages] = useState<Record<number, string>>({});

  const load = async () => {
    if (!token) return;
    const setup = await api.adminSetup(token);
    setForm({
      name: setup.school.name,
      address: parseAddress(setup.school.address),
      startTime: setup.school.startTime || '',
      dismissalTime: setup.school.dismissalTime || '',
      extendedTime: setup.school.extendedTime || '',
    });
    setLocations(setup.campuses.map(c => ({
      id: c.id,
      name: c.name,
      address: parseAddress(c.address),
      geofenceRadius: c.geofenceRadius != null ? String(c.geofenceRadius) : DEFAULT_GEOFENCE_RADIUS,
      hasCoordinates: c.latitude != null && c.longitude != null,
      startTime: c.startTime || '',
      dismissalTime: c.dismissalTime || '',
      extendedTime: c.extendedTime || '',
    })));
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const set = (key: 'name' | 'startTime' | 'dismissalTime' | 'extendedTime', value: string) => setForm(current => ({ ...current, [key]: value }));
  const setSchoolAddress = (key: keyof AddressFields, value: string) =>
    setForm(current => ({ ...current, address: { ...current.address, [key]: value } }));

  const save = async () => {
    if (!token) return;
    setMessage('');
    setSubmitting(true);
    try {
      await api.updateSchoolProfile(token, { ...form, address: formatAddress(form.address) });
      setMessage('School profile saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save school profile');
    } finally {
      setSubmitting(false);
    }
  };

  const updateLocation = (index: number, patch: Partial<LocationForm>) =>
    setLocations(prev => prev.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));

  const updateLocationAddress = (index: number, key: keyof AddressFields, value: string) =>
    setLocations(prev => prev.map((loc, i) => i === index
      ? { ...loc, address: { ...loc.address, [key]: value }, hasCoordinates: false }
      : loc));

  const addAnotherLocation = () => setLocations(prev => [...prev, emptyLocation()]);

  const removeUnsavedLocation = (index: number) => setLocations(prev => prev.filter((_, i) => i !== index));

  const saveLocation = async (index: number) => {
    if (!token) return;
    const loc = locations[index];
    const showLocationMessage = (value: string) => setLocationMessages(current => ({ ...current, [index]: value }));
    if (!loc.name.trim()) { showLocationMessage('Location name is required.'); return; }
    if (!loc.address.addressLine1.trim() || !loc.address.city.trim() || !loc.address.state.trim() || !loc.address.postalCode.trim()) {
      showLocationMessage('Street address, city, state, and ZIP/postal code are required for the location geofence.'); return;
    }
    const radius = Number(loc.geofenceRadius);
    if (!Number.isFinite(radius) || radius <= 0) { showLocationMessage('Geofence radius must be a positive number of meters.'); return; }
    showLocationMessage('Verifying address…');
    setSavingIndex(index);
    try {
      const input = { name: loc.name, address: formatAddress(loc.address), geofenceRadius: radius, startTime: loc.startTime, dismissalTime: loc.dismissalTime, extendedTime: loc.extendedTime };
      if (loc.id) {
        await api.updateCampus(token, loc.id, input);
      } else {
        const result = await api.addCampus(token, input);
        updateLocation(index, { id: result.id });
      }
      // A successful save always means the address just geocoded fine
      // (the backend rejects the request otherwise) — mark it here rather
      // than reloading the whole screen just to confirm that.
      await load();
      showLocationMessage(`${loc.name} saved and mapped successfully.`);
    } catch (error) {
      showLocationMessage(error instanceof Error ? error.message : 'Could not save location');
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <Screen title="School Setup" subtitle="School name, daily hours, and extended-day (daycare) hours.">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="field-label" style={{ margin: 0 }}>School Name</p>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />

        <p className="field-label" style={{ margin: 0 }}>School Mailing Address</p>
        <input className="input" autoComplete="address-line1" placeholder="Street address" value={form.address.addressLine1} onChange={e => setSchoolAddress('addressLine1', e.target.value)} />
        <input className="input" autoComplete="address-line2" placeholder="Suite, unit, building (optional)" value={form.address.addressLine2} onChange={e => setSchoolAddress('addressLine2', e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(90px, 1fr)', gap: 10 }}>
          <input className="input" autoComplete="address-level2" placeholder="City" value={form.address.city} onChange={e => setSchoolAddress('city', e.target.value)} />
          <input className="input" autoComplete="address-level1" placeholder="State/Province" value={form.address.state} onChange={e => setSchoolAddress('state', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) minmax(0, 2fr)', gap: 10 }}>
          <input className="input" autoComplete="postal-code" placeholder="ZIP/Postal code" value={form.address.postalCode} onChange={e => setSchoolAddress('postalCode', e.target.value)} />
          <input className="input" autoComplete="country-name" placeholder="Country" value={form.address.country} onChange={e => setSchoolAddress('country', e.target.value)} />
        </div>

        <p className="field-label" style={{ margin: 0 }}>Start Time</p>
        <input className="input" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />

        <p className="field-label" style={{ margin: 0 }}>Dismissal Time</p>
        <input className="input" type="time" value={form.dismissalTime} onChange={e => set('dismissalTime', e.target.value)} />

        <p className="field-label" style={{ margin: 0 }}>Extended Time (Daycare Dismissal)</p>
        <input className="input" type="time" value={form.extendedTime} onChange={e => set('extendedTime', e.target.value)} />

        <p className="field-label" style={{ margin: 0 }}>
          A student dropped off after Start Time is marked "L" (late) on their parent's attendance record.
        </p>

        <button type="button" className="btn btn-primary" onClick={save} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>

      {message && <div className="card">{message}</div>}

      <p className="form-title" style={{ margin: '4px 0' }}>Locations</p>
      <p className="field-label" style={{ margin: '0 0 4px' }}>
        For schools with more than one site — each location can have its own hours, separate from the school-wide ones above.
      </p>

      {locations.map((loc, index) => (
        <div key={loc.id ?? `new-${index}`} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card-header">
            <p className="form-title" style={{ margin: 0 }}>{loc.id ? loc.name || 'Location' : 'New Location'}</p>
            {!loc.id && <button type="button" className="link-danger" onClick={() => removeUnsavedLocation(index)}>Remove</button>}
          </div>

          <p className="field-label" style={{ margin: 0 }}>Location Name</p>
          <input className="input" value={loc.name} onChange={e => updateLocation(index, { name: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>School Location Address</p>
          <input className="input" autoComplete="address-line1" placeholder="Street address" value={loc.address.addressLine1} onChange={e => updateLocationAddress(index, 'addressLine1', e.target.value)} />
          <input className="input" autoComplete="address-line2" placeholder="Suite, unit, building (optional)" value={loc.address.addressLine2} onChange={e => updateLocationAddress(index, 'addressLine2', e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(90px, 1fr)', gap: 10 }}>
            <input className="input" autoComplete="address-level2" placeholder="City" value={loc.address.city} onChange={e => updateLocationAddress(index, 'city', e.target.value)} />
            <input className="input" autoComplete="address-level1" placeholder="State/Province" value={loc.address.state} onChange={e => updateLocationAddress(index, 'state', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) minmax(0, 2fr)', gap: 10 }}>
            <input className="input" autoComplete="postal-code" placeholder="ZIP/Postal code" value={loc.address.postalCode} onChange={e => updateLocationAddress(index, 'postalCode', e.target.value)} />
            <input className="input" autoComplete="country-name" placeholder="Country" value={loc.address.country} onChange={e => updateLocationAddress(index, 'country', e.target.value)} />
          </div>

          <p className="field-label" style={{ margin: 0 }}>Pickup/Drop-off Radius (meters)</p>
          <input className="input" type="number" min={1} value={loc.geofenceRadius} onChange={e => updateLocation(index, { geofenceRadius: e.target.value })} />
          <p className="field-label" style={{ margin: 0 }}>
            {loc.hasCoordinates
              ? '📍 Located — drop-off/pick-up will require being within this radius of the address above.'
              : 'A parent must be within this radius of the address above for drop-off/pick-up to activate.'}
          </p>

          <p className="field-label" style={{ margin: 0 }}>Start Time</p>
          <input className="input" type="time" value={loc.startTime} onChange={e => updateLocation(index, { startTime: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>Dismissal Time</p>
          <input className="input" type="time" value={loc.dismissalTime} onChange={e => updateLocation(index, { dismissalTime: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>Extended Time (Daycare Dismissal)</p>
          <input className="input" type="time" value={loc.extendedTime} onChange={e => updateLocation(index, { extendedTime: e.target.value })} />

          <button type="button" className="btn btn-primary" onClick={() => saveLocation(index)} disabled={savingIndex === index}>
            {savingIndex === index ? 'Saving…' : 'Save Location'}
          </button>
          {locationMessages[index] && <p className="field-label" style={{ margin: 0 }}>{locationMessages[index]}</p>}
        </div>
      ))}

      <button type="button" className="btn btn-secondary" onClick={addAnotherLocation}>+ Add Another Location</button>
    </Screen>
  );
}
