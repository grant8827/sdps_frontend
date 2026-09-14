import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

const emptyForm = { name: '', startTime: '', dismissalTime: '', extendedTime: '' };

interface LocationForm {
  id: string | null; // null = not saved yet (added via "+ Add Another Location")
  name: string;
  address: string;
  startTime: string;
  dismissalTime: string;
  extendedTime: string;
}
const emptyLocation = (): LocationForm => ({ id: null, name: '', address: '', startTime: '', dismissalTime: '', extendedTime: '' });

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

  const load = async () => {
    if (!token) return;
    const setup = await api.adminSetup(token);
    setForm({
      name: setup.school.name,
      startTime: setup.school.startTime || '',
      dismissalTime: setup.school.dismissalTime || '',
      extendedTime: setup.school.extendedTime || '',
    });
    setLocations(setup.campuses.map(c => ({
      id: c.id,
      name: c.name,
      address: c.address || '',
      startTime: c.startTime || '',
      dismissalTime: c.dismissalTime || '',
      extendedTime: c.extendedTime || '',
    })));
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const save = async () => {
    if (!token) return;
    setMessage('');
    setSubmitting(true);
    try {
      await api.updateSchoolProfile(token, form);
      setMessage('School profile saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save school profile');
    } finally {
      setSubmitting(false);
    }
  };

  const updateLocation = (index: number, patch: Partial<LocationForm>) =>
    setLocations(prev => prev.map((loc, i) => (i === index ? { ...loc, ...patch } : loc)));

  const addAnotherLocation = () => setLocations(prev => [...prev, emptyLocation()]);

  const removeUnsavedLocation = (index: number) => setLocations(prev => prev.filter((_, i) => i !== index));

  const saveLocation = async (index: number) => {
    if (!token) return;
    const loc = locations[index];
    if (!loc.name.trim()) { setMessage('Location name is required.'); return; }
    setMessage('');
    setSavingIndex(index);
    try {
      const input = { name: loc.name, address: loc.address || undefined, startTime: loc.startTime, dismissalTime: loc.dismissalTime, extendedTime: loc.extendedTime };
      if (loc.id) {
        await api.updateCampus(token, loc.id, input);
      } else {
        const result = await api.addCampus(token, input);
        updateLocation(index, { id: result.id });
      }
      setMessage(`${loc.name} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save location');
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <Screen title="School Setup" subtitle="School name, daily hours, and extended-day (daycare) hours.">
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p className="field-label" style={{ margin: 0 }}>School Name</p>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />

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

          <p className="field-label" style={{ margin: 0 }}>Address (optional)</p>
          <input className="input" value={loc.address} onChange={e => updateLocation(index, { address: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>Start Time</p>
          <input className="input" type="time" value={loc.startTime} onChange={e => updateLocation(index, { startTime: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>Dismissal Time</p>
          <input className="input" type="time" value={loc.dismissalTime} onChange={e => updateLocation(index, { dismissalTime: e.target.value })} />

          <p className="field-label" style={{ margin: 0 }}>Extended Time (Daycare Dismissal)</p>
          <input className="input" type="time" value={loc.extendedTime} onChange={e => updateLocation(index, { extendedTime: e.target.value })} />

          <button type="button" className="btn btn-primary" onClick={() => saveLocation(index)} disabled={savingIndex === index}>
            {savingIndex === index ? 'Saving…' : 'Save Location'}
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-secondary" onClick={addAnotherLocation}>+ Add Another Location</button>
    </Screen>
  );
}
