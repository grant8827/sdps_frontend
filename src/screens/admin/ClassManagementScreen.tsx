import { useEffect, useState } from 'react';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { api, type AdminSetup, type ClassRow } from '../../services/api';

const emptyForm = { name: '', gradeLevelId: '', roomName: '', schoolYearId: '', campusId: '' };

type Tab = 'list' | 'register';

/** Admin's Classes screen: create classrooms (name, grade, room, school year), and see who's assigned/enrolled in each. */
export function ClassManagementScreen() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>('list');
  const [setup, setSetup] = useState<AdminSetup | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!token) return;
    const [nextSetup, nextClasses] = await Promise.all([api.adminSetup(token), api.classes(token)]);
    setSetup(nextSetup);
    setClasses(nextClasses);
    setForm(current => ({
      ...current,
      schoolYearId: current.schoolYearId || nextSetup.schoolYears.find(y => y.status === 'ACTIVE')?.id || '',
      gradeLevelId: current.gradeLevelId || nextSetup.gradeLevels[0]?.id || '',
    }));
  };
  useEffect(() => { load().catch(error => setMessage(error.message)); }, [token]);

  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!token) return;
    setMessage('');
    if (!form.name.trim()) { setMessage('Class name is required.'); return; }
    if (!form.gradeLevelId || !form.schoolYearId) { setMessage('Grade and school year are required.'); return; }
    setSubmitting(true);
    try {
      await api.addClass(token, { name: form.name, gradeLevelId: form.gradeLevelId, roomName: form.roomName || undefined, schoolYearId: form.schoolYearId, campusId: form.campusId || undefined });
      setForm({ ...emptyForm, schoolYearId: form.schoolYearId, gradeLevelId: setup?.gradeLevels[0]?.id || '' });
      setMessage('Class added.');
      setTab('list');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add class');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen title="Classes" subtitle="Set up classrooms — name, grade, and room.">
      <div className="subtabs">
        <button type="button" className={`subtab${tab === 'list' ? ' subtab-active' : ''}`} onClick={() => setTab('list')}>Classes</button>
        <button type="button" className={`subtab${tab === 'register' ? ' subtab-active' : ''}`} onClick={() => setTab('register')}>Add a Class</button>
      </div>
      {message && <div className="card">{message}</div>}

      {tab === 'register' && (
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <p className="form-title">New class</p>
          <input className="input" placeholder="Class name (e.g. Grade 1 - Room 12)" value={form.name} onChange={e => set('name', e.target.value)} />
          <div className="btn-row">
            <select className="input" value={form.gradeLevelId} onChange={e => set('gradeLevelId', e.target.value)}>{setup?.gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
            <input className="input" placeholder="Room name (optional)" value={form.roomName} onChange={e => set('roomName', e.target.value)} />
          </div>
          <select className="input" value={form.schoolYearId} onChange={e => set('schoolYearId', e.target.value)}>{setup?.schoolYears.map(y => <option key={y.id} value={y.id}>{y.name}{y.status === 'ACTIVE' ? ' (active)' : ''}</option>)}</select>
          {setup && setup.campuses.length > 1 && (
            <select className="input" value={form.campusId} onChange={e => set('campusId', e.target.value)}>
              <option value="">Default campus</option>
              {setup.campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Adding…' : 'Add Class'}</button>
        </div>
      )}

      {tab === 'list' && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Class</th><th>Grade</th><th>Room</th><th>School Year</th><th>Teacher</th><th>Students</th></tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.gradeName}</td>
                  <td>{c.roomName || '—'}</td>
                  <td>{c.schoolYearName}</td>
                  <td>{c.teacherName || 'Unassigned'}</td>
                  <td>{c.studentCount}</td>
                </tr>
              ))}
              {classes.length === 0 && <tr><td colSpan={6} className="empty-text">No classes set up yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}
